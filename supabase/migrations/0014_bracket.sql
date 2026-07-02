-- MatchUp App — v2 Slice 5: fase de llaves / bracket
-- Ref: spec-v2.md "Feature 5 — Fase de llaves / bracket"
--
-- Delta sobre v1/v2-previo:
--   * tournaments: qualifiers_per_zone (clasificados por zona) + bracket_published
--     (oculto hasta publicar, igual que zones.is_published pero a nivel torneo).
--   * matches: se activan los campos de bracket. team1/team2_pair_id pasan a
--     NULLABLE (slots TBD del bracket); se suma tournament_id (los partidos de
--     bracket NO tienen zone_id → no se puede derivar el dueño por la zona),
--     phase ('zone'|'bracket'), bracket_round/bracket_slot, next_match_id/
--     next_slot (a qué partido y lado avanza el ganador).
--   * RLS: policy nueva para que el dueño gestione sus partidos de bracket
--     (las policies de v1 derivaban todo por la zona; con zone_id null no aplican).
--   * RPCs: generate_bracket (siembra estándar + byes), record/clear_bracket_result
--     (avance del ganador al next_match + limpieza aguas abajo), swap_bracket_
--     participants (override manual de cruces antes de publicar).
--   * public_bracket_view: superficie pública (vista definer; sin PII).
--
-- Modelo de BYES (clasificados no potencia de 2): un bye NO es un partido. La
-- pareja sembrada contra un hueco se ubica DIRECTAMENTE en la ronda 2 (en su
-- next_slot) y el partido de ronda 1 correspondiente no se crea. Así la
-- progresión es uniforme (todo partido real tiene dos parejas) y no hay
-- "partidos fantasma" auto-finalizados.

-- ===========================================================================
-- Enums
-- ===========================================================================
create type match_phase as enum ('zone', 'bracket');
create type team_slot   as enum ('team1', 'team2');

-- ===========================================================================
-- Tournament (delta)
-- ===========================================================================
alter table tournaments
  add column qualifiers_per_zone integer not null default 2
    constraint tournaments_qualifiers_valid check (qualifiers_per_zone >= 1),
  add column bracket_published   boolean not null default false;

-- ===========================================================================
-- Match (delta)
-- ===========================================================================
alter table matches
  alter column team1_pair_id drop not null,
  alter column team2_pair_id drop not null,
  add column tournament_id uuid references tournaments (id) on delete cascade,
  add column phase         match_phase not null default 'zone',
  add column bracket_round integer,
  add column bracket_slot  integer,
  add column next_match_id uuid references matches (id) on delete set null,
  add column next_slot     team_slot;

create index matches_tournament_phase_idx on matches (tournament_id, phase);
create index matches_next_match_idx on matches (next_match_id);

-- ===========================================================================
-- RLS — partidos de bracket: el dueño gestiona (zone_id es null, así que las
-- policies de v1 que derivan por la zona no aplican). public_bracket_view cubre
-- la lectura pública (vista definer), por eso acá sólo hace falta el dueño.
-- ===========================================================================
create policy matches_bracket_owner on matches
  for all
  to authenticated
  using (
    phase = 'bracket' and tournament_id is not null and owns_tournament(tournament_id)
  )
  with check (
    phase = 'bracket' and tournament_id is not null and owns_tournament(tournament_id)
  );

-- ===========================================================================
-- generate_bracket — siembra el bracket a partir de los clasificados de zona.
-- Requiere torneo in_progress, todas las zonas con standings congelados y el
-- bracket no publicado. Idempotente: borra el bracket previo y lo rehace.
-- Siembra estándar (1 vs N, 2 vs N-1, …) con byes a los mejores sembrados.
-- ===========================================================================
create or replace function generate_bracket(p_tournament_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status      tournament_status;
  v_published   boolean;
  v_qpz         int;
  v_zone_total  int;
  v_zone_frozen int;
  v_qual        uuid[];   -- pair_id por ranking global de siembra (1..v_q)
  v_q           int;      -- total de clasificados
  v_n           int;      -- tamaño del bracket (potencia de 2 >= v_q)
  v_rounds      int;
  v_seed        int[];    -- orden de siembra estándar, largo v_n
  v_tmp         int;
  r             int;
  s             int;
  v_t1          uuid;
  v_t2          uuid;
  rec           record;
begin
  select status, bracket_published, qualifiers_per_zone
    into v_status, v_published, v_qpz
  from tournaments where id = p_tournament_id;
  if not found then raise exception 'TOURNAMENT_NOT_FOUND'; end if;
  if not owns_tournament(p_tournament_id) then raise exception 'NOT_OWNER'; end if;
  if v_status <> 'in_progress' then raise exception 'INVALID_STATUS'; end if;
  if v_published then raise exception 'BRACKET_PUBLISHED'; end if;

  -- Todas las zonas del torneo deben tener standings congelados.
  select count(*), count(*) filter (where standings_frozen)
    into v_zone_total, v_zone_frozen
  from zones where tournament_id = p_tournament_id;
  if coalesce(v_zone_total, 0) = 0 then raise exception 'NO_ZONES'; end if;
  if v_zone_frozen <> v_zone_total then raise exception 'ZONES_NOT_FROZEN'; end if;

  -- Clasificados: las primeras qualifiers_per_zone de cada zona (por posición),
  -- ordenadas globalmente por posición asc → puntos desc → pair_id. Así los
  -- ganadores de zona toman los mejores sembrados (se reparten en mitades
  -- opuestas por la siembra estándar).
  select array_agg(pair_id order by position asc, points desc, pair_id)
    into v_qual
  from (
    select zp.pair_id, zp.position, zp.points,
           row_number() over (partition by zp.zone_id order by zp.position asc) as rn
    from zone_pairs zp
    join zones z on z.id = zp.zone_id
    where z.tournament_id = p_tournament_id and zp.position is not null
  ) ranked
  where rn <= v_qpz;

  v_q := coalesce(array_length(v_qual, 1), 0);
  if v_q < 2 then raise exception 'NOT_ENOUGH_QUALIFIERS'; end if;

  delete from matches where tournament_id = p_tournament_id and phase = 'bracket';

  -- Tamaño del bracket = menor potencia de 2 >= v_q.
  v_n := 1;
  while v_n < v_q loop v_n := v_n * 2; end loop;

  -- Cantidad de rondas = log2(v_n).
  v_rounds := 0;
  v_tmp := v_n;
  while v_tmp > 1 loop v_rounds := v_rounds + 1; v_tmp := v_tmp / 2; end loop;

  -- Orden de siembra estándar para v_n posiciones:
  -- [1] → [1,2] → [1,4,3,2] → [1,8,5,4,3,6,7,2] → …
  v_seed := array[1];
  while array_length(v_seed, 1) < v_n loop
    declare
      m   int := array_length(v_seed, 1) * 2 + 1;
      nxt int[] := array[]::int[];
      x   int;
    begin
      foreach x in array v_seed loop
        nxt := nxt || x || (m - x);
      end loop;
      v_seed := nxt;
    end;
  end loop;

  -- Árbol completo: rondas 1..v_rounds, cada ronda r con v_n/2^r partidos.
  for r in 1 .. v_rounds loop
    for s in 1 .. (v_n / power(2, r))::int loop
      insert into matches (tournament_id, phase, round, bracket_round, bracket_slot)
      values (p_tournament_id, 'bracket', r, r, s);
    end loop;
  end loop;

  -- Enlazar next_match_id / next_slot (slot impar → team1, par → team2).
  update matches m
    set next_match_id = nb.id,
        next_slot = case when (m.bracket_slot % 2) = 1 then 'team1'::team_slot
                         else 'team2'::team_slot end
  from matches nb
  where m.tournament_id = p_tournament_id and m.phase = 'bracket'
    and nb.tournament_id = p_tournament_id and nb.phase = 'bracket'
    and nb.bracket_round = m.bracket_round + 1
    and nb.bracket_slot = ceil(m.bracket_slot::numeric / 2);

  -- Asignar parejas a la ronda 1 según el orden de siembra (seed > v_q = hueco).
  for s in 1 .. (v_n / 2) loop
    v_t1 := case when v_seed[2 * s - 1] <= v_q then v_qual[v_seed[2 * s - 1]] else null end;
    v_t2 := case when v_seed[2 * s]     <= v_q then v_qual[v_seed[2 * s]]     else null end;
    update matches
      set team1_pair_id = v_t1, team2_pair_id = v_t2
    where tournament_id = p_tournament_id and phase = 'bracket'
      and bracket_round = 1 and bracket_slot = s;
  end loop;

  -- Colapsar byes: ronda 1 con exactamente una pareja → pasa directo a la ronda
  -- 2 (su next_slot) y se elimina el partido de ronda 1.
  for rec in
    select id, team1_pair_id, team2_pair_id, next_match_id, next_slot
    from matches
    where tournament_id = p_tournament_id and phase = 'bracket' and bracket_round = 1
      and (team1_pair_id is null) <> (team2_pair_id is null)
  loop
    if rec.next_slot = 'team1' then
      update matches set team1_pair_id = coalesce(rec.team1_pair_id, rec.team2_pair_id)
        where id = rec.next_match_id;
    else
      update matches set team2_pair_id = coalesce(rec.team1_pair_id, rec.team2_pair_id)
        where id = rec.next_match_id;
    end if;
    delete from matches where id = rec.id;
  end loop;
end;
$$;

revoke execute on function generate_bracket(uuid) from public, anon;
grant  execute on function generate_bracket(uuid) to authenticated;

-- ===========================================================================
-- _clear_bracket_downstream — resetea el resultado de un partido de bracket y,
-- si ya había propagado un ganador, lo quita del siguiente y recursa. Interno
-- (lo usan record/clear_bracket_result). No se otorga a nadie.
-- ===========================================================================
create or replace function _clear_bracket_downstream(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_winner uuid;
  v_next   uuid;
  v_nslot  team_slot;
begin
  select winner_pair_id, next_match_id, next_slot
    into v_winner, v_next, v_nslot
  from matches where id = p_match_id;
  if not found then return; end if;

  update matches
    set team1_score = null, team2_score = null, score_detail = null,
        winner_pair_id = null, status = 'pending'
  where id = p_match_id;

  if v_winner is not null and v_next is not null then
    if v_nslot = 'team1' then
      update matches set team1_pair_id = null where id = v_next;
    else
      update matches set team2_pair_id = null where id = v_next;
    end if;
    perform _clear_bracket_downstream(v_next);
  end if;
end;
$$;

revoke execute on function _clear_bracket_downstream(uuid) from public, anon, authenticated;

-- ===========================================================================
-- record_bracket_result — persiste el resultado de un partido de bracket y
-- avanza al ganador al next_match/next_slot. Si se corrige y cambia el ganador
-- ya propagado, limpia aguas abajo antes de re-propagar. La validación de las
-- reglas de scoring vive en TS (computeResult); acá llegan los valores ya
-- computados y se validan ownership + que el ganador sea uno de los dos.
-- ===========================================================================
create or replace function record_bracket_result(
  p_match_id uuid,
  p_team1_score int,
  p_team2_score int,
  p_score_detail jsonb,
  p_winner_pair_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tid    uuid;
  v_phase  match_phase;
  v_status tournament_status;
  v_t1p    uuid;
  v_t2p    uuid;
  v_next   uuid;
  v_nslot  team_slot;
  v_prev   uuid;
begin
  select tournament_id, phase, team1_pair_id, team2_pair_id,
         next_match_id, next_slot, winner_pair_id
    into v_tid, v_phase, v_t1p, v_t2p, v_next, v_nslot, v_prev
  from matches where id = p_match_id;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;
  if v_phase <> 'bracket' then raise exception 'NOT_BRACKET'; end if;
  if not owns_tournament(v_tid) then raise exception 'NOT_OWNER'; end if;

  select status into v_status from tournaments where id = v_tid;
  if v_status <> 'in_progress' then raise exception 'INVALID_STATUS'; end if;

  if v_t1p is null or v_t2p is null then raise exception 'MATCH_NOT_READY'; end if;
  if p_winner_pair_id is null or p_winner_pair_id not in (v_t1p, v_t2p) then
    raise exception 'INVALID_WINNER';
  end if;

  update matches
    set team1_score = p_team1_score, team2_score = p_team2_score,
        score_detail = p_score_detail, winner_pair_id = p_winner_pair_id,
        status = 'finished'
  where id = p_match_id;

  if v_next is not null then
    -- Corrección que cambia el ganador ya propagado → limpiar aguas abajo.
    if v_prev is not null and v_prev <> p_winner_pair_id then
      perform _clear_bracket_downstream(v_next);
    end if;
    if v_nslot = 'team1' then
      update matches set team1_pair_id = p_winner_pair_id where id = v_next;
    else
      update matches set team2_pair_id = p_winner_pair_id where id = v_next;
    end if;
  end if;
end;
$$;

revoke execute on function record_bracket_result(uuid, int, int, jsonb, uuid) from public, anon;
grant  execute on function record_bracket_result(uuid, int, int, jsonb, uuid) to authenticated;

-- ===========================================================================
-- clear_bracket_result — borra el resultado de un partido de bracket (vuelve a
-- pending) y limpia el avance aguas abajo. Sólo dueño + torneo in_progress.
-- ===========================================================================
create or replace function clear_bracket_result(p_match_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tid    uuid;
  v_phase  match_phase;
  v_status tournament_status;
begin
  select tournament_id, phase into v_tid, v_phase
  from matches where id = p_match_id;
  if not found then raise exception 'MATCH_NOT_FOUND'; end if;
  if v_phase <> 'bracket' then raise exception 'NOT_BRACKET'; end if;
  if not owns_tournament(v_tid) then raise exception 'NOT_OWNER'; end if;

  select status into v_status from tournaments where id = v_tid;
  if v_status <> 'in_progress' then raise exception 'INVALID_STATUS'; end if;

  perform _clear_bracket_downstream(p_match_id);
end;
$$;

revoke execute on function clear_bracket_result(uuid) from public, anon;
grant  execute on function clear_bracket_result(uuid) to authenticated;

-- ===========================================================================
-- swap_bracket_participants — override manual de cruces: intercambia la posición
-- de dos parejas en el bracket. Sólo antes de publicar y antes de que se cargue
-- cualquier resultado (no hay partidos finished → todas las parejas están en su
-- slot inicial de siembra). Permite corregir un cruce no deseado.
-- ===========================================================================
create or replace function swap_bracket_participants(p_pair_a uuid, p_pair_b uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tid       uuid;
  v_published boolean;
  v_finished  int;
  va_match    uuid;
  va_slot     team_slot;
  vb_match    uuid;
  vb_slot     team_slot;
begin
  if p_pair_a = p_pair_b then return; end if;

  -- Ubicar la pareja A en el bracket.
  select id, tournament_id,
         case when team1_pair_id = p_pair_a then 'team1'::team_slot else 'team2'::team_slot end
    into va_match, v_tid, va_slot
  from matches
  where phase = 'bracket' and p_pair_a in (team1_pair_id, team2_pair_id)
  limit 1;
  if va_match is null then raise exception 'PAIR_NOT_IN_BRACKET'; end if;

  if not owns_tournament(v_tid) then raise exception 'NOT_OWNER'; end if;

  select bracket_published into v_published from tournaments where id = v_tid;
  if v_published then raise exception 'BRACKET_PUBLISHED'; end if;

  select count(*) into v_finished
  from matches where tournament_id = v_tid and phase = 'bracket' and status = 'finished';
  if v_finished > 0 then raise exception 'BRACKET_STARTED'; end if;

  -- Ubicar la pareja B en el MISMO torneo.
  select id,
         case when team1_pair_id = p_pair_b then 'team1'::team_slot else 'team2'::team_slot end
    into vb_match, vb_slot
  from matches
  where phase = 'bracket' and tournament_id = v_tid
    and p_pair_b in (team1_pair_id, team2_pair_id)
  limit 1;
  if vb_match is null then raise exception 'PAIR_NOT_IN_BRACKET'; end if;

  -- Intercambiar: A toma el lugar de B y viceversa.
  update matches
    set team1_pair_id = case when va_slot = 'team1' then p_pair_b else team1_pair_id end,
        team2_pair_id = case when va_slot = 'team2' then p_pair_b else team2_pair_id end
  where id = va_match;
  update matches
    set team1_pair_id = case when vb_slot = 'team1' then p_pair_a else team1_pair_id end,
        team2_pair_id = case when vb_slot = 'team2' then p_pair_a else team2_pair_id end
  where id = vb_match;
end;
$$;

revoke execute on function swap_bracket_participants(uuid, uuid) from public, anon;
grant  execute on function swap_bracket_participants(uuid, uuid) to authenticated;

-- ===========================================================================
-- public_bracket_view — superficie pública del bracket (vista definer: bypassa
-- RLS y expone sólo columnas seguras de torneos con bracket_published). Los
-- nombres de las parejas salen por public_pair_view (sin PII).
-- ===========================================================================
create view public_bracket_view as
  select
    m.id,
    m.tournament_id,
    m.bracket_round,
    m.bracket_slot,
    m.team1_pair_id,
    m.team2_pair_id,
    m.team1_score,
    m.team2_score,
    m.score_detail,
    m.winner_pair_id,
    m.status,
    m.next_match_id,
    m.next_slot
  from matches m
  join tournaments t on t.id = m.tournament_id
  where m.phase = 'bracket' and t.bracket_published;

grant select on public_bracket_view to anon, authenticated;
