-- Matchpoint App — v2 Slice 4b: formatos de partido por zona
-- Ref: spec-v2.md "Feature 4 — Formatos de partido por zona + standings"
--
-- Completa la Feature 4 sumando los formatos winner_vs_loser y manual al núcleo
-- de standings ya entregado en 0012 (round_robin):
--   * generate_zone_matches(zone, format): (re)genera los partidos de UNA zona
--     según el formato elegido. round_robin → todas contra todas (helper de 0007);
--     winner_vs_loser → sólo la ronda 1 (la 2 depende de resultados); manual → ninguno.
--   * generate_next_zone_round(zone): en winner_vs_loser, genera la ronda 2
--     (ganador-vs-ganador y perdedor-vs-perdedor) una vez cargados los resultados
--     de la ronda 1.
--   * freeze_zone_standings (redefinida): ramifica por formato — round_robin con
--     desempate head-to-head; winner_vs_loser por progresión.
--   * freeze_manual_standings(zone, pair_ids[]): congela posiciones fijadas a mano.
--   * move_pair_to_zone (redefinida): al mover una pareja, las zonas afectadas
--     vuelven a round_robin (cambió la cantidad de parejas → wvl/manual quedarían
--     inconsistentes).

-- ===========================================================================
-- Helper interno: genera la RONDA 1 de winner_vs_loser en UNA zona de 4 parejas.
-- Empareja por pair_id (determinístico): (p1 vs p2), (p3 vs p4). La ronda 2 NO se
-- crea acá: depende de los resultados (generate_next_zone_round).
-- No se otorga a nadie: sólo lo invoca generate_zone_matches (SECURITY DEFINER).
-- ===========================================================================
create or replace function _zone_wvl_round1(p_zone_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_ids uuid[];
begin
  delete from matches where zone_id = p_zone_id;

  select array_agg(pair_id order by pair_id)
    into v_ids
  from zone_pairs where zone_id = p_zone_id;

  if array_length(v_ids, 1) is distinct from 4 then
    raise exception 'WVL_NEEDS_4';
  end if;

  insert into matches (zone_id, round, team1_pair_id, team2_pair_id) values
    (p_zone_id, 1, v_ids[1], v_ids[2]),
    (p_zone_id, 1, v_ids[3], v_ids[4]);
end;
$$;

revoke execute on function _zone_wvl_round1(uuid) from public, anon, authenticated;

-- ===========================================================================
-- generate_zone_matches — (re)genera los partidos de UNA zona con el formato
-- elegido. Fija zones.match_format, limpia posiciones congeladas y rehace los
-- partidos. Pre-publicación (igual que generate_zones / move_pair_to_zone).
-- ===========================================================================
create or replace function generate_zone_matches(p_zone_id uuid, p_format match_format)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tournament_id uuid;
  v_published     boolean;
  v_status        tournament_status;
begin
  select z.tournament_id, z.is_published, t.status
    into v_tournament_id, v_published, v_status
  from zones z
  join tournaments t on t.id = z.tournament_id
  where z.id = p_zone_id;

  if not found then raise exception 'ZONE_NOT_FOUND'; end if;
  if not owns_tournament(v_tournament_id) then raise exception 'NOT_OWNER'; end if;
  if v_published then raise exception 'ZONES_PUBLISHED'; end if;
  if v_status not in ('registration_closed', 'in_progress') then
    raise exception 'INVALID_STATUS';
  end if;

  -- Cambiar de formato reinicia las posiciones de la zona.
  update zone_pairs set position = null, points = 0 where zone_id = p_zone_id;
  update zones set match_format = p_format, standings_frozen = false
    where id = p_zone_id;

  if p_format = 'round_robin' then
    perform _zone_round_robin(p_zone_id);
  elsif p_format = 'winner_vs_loser' then
    perform _zone_wvl_round1(p_zone_id);
  else
    -- manual: el organizador agrega los partidos a mano.
    delete from matches where zone_id = p_zone_id;
  end if;
end;
$$;

revoke execute on function generate_zone_matches(uuid, match_format) from public, anon;
grant  execute on function generate_zone_matches(uuid, match_format) to authenticated;

-- ===========================================================================
-- generate_next_zone_round — winner_vs_loser: genera la ronda 2 a partir de los
-- resultados de la ronda 1. Requiere las 2 partidos de ronda 1 'finished'.
-- Idempotente mientras la ronda 2 no tenga resultados (permite recomputar si se
-- corrige un resultado de ronda 1); si ya hay un partido de ronda 2 finished,
-- exige reabrir/corregir primero (ROUND2_PLAYED).
-- ===========================================================================
create or replace function generate_next_zone_round(p_zone_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tournament_id uuid;
  v_format        match_format;
  v_r1_total      int;
  v_r1_pending    int;
  v_w1 uuid; v_l1 uuid; v_w2 uuid; v_l2 uuid;
begin
  select z.tournament_id, z.match_format
    into v_tournament_id, v_format
  from zones z where z.id = p_zone_id;

  if not found then raise exception 'ZONE_NOT_FOUND'; end if;
  if not owns_tournament(v_tournament_id) then raise exception 'NOT_OWNER'; end if;
  if v_format <> 'winner_vs_loser' then raise exception 'WRONG_FORMAT'; end if;

  select count(*), count(*) filter (where status <> 'finished')
    into v_r1_total, v_r1_pending
  from matches where zone_id = p_zone_id and round = 1;

  if v_r1_total <> 2 then raise exception 'ROUND1_PENDING'; end if;
  if v_r1_pending > 0 then raise exception 'ROUND1_PENDING'; end if;

  if exists (
    select 1 from matches
    where zone_id = p_zone_id and round = 2 and status = 'finished'
  ) then
    raise exception 'ROUND2_PLAYED';
  end if;

  -- Ganadores y perdedores de cada partido de ronda 1 (ordenados por id para
  -- una asignación determinística de slots).
  select
    (array_agg(winner_pair_id order by id))[1],
    (array_agg(case when winner_pair_id = team1_pair_id then team2_pair_id else team1_pair_id end order by id))[1],
    (array_agg(winner_pair_id order by id))[2],
    (array_agg(case when winner_pair_id = team1_pair_id then team2_pair_id else team1_pair_id end order by id))[2]
    into v_w1, v_l1, v_w2, v_l2
  from matches where zone_id = p_zone_id and round = 1;

  delete from matches where zone_id = p_zone_id and round = 2;

  insert into matches (zone_id, round, team1_pair_id, team2_pair_id) values
    (p_zone_id, 2, v_w1, v_w2),   -- define 1º / 2º
    (p_zone_id, 2, v_l1, v_l2);   -- define 3º / 4º
end;
$$;

revoke execute on function generate_next_zone_round(uuid) from public, anon;
grant  execute on function generate_next_zone_round(uuid) to authenticated;

-- ===========================================================================
-- freeze_zone_standings (REDEFINIDA) — congela posiciones ramificando por formato.
--   * round_robin: puntos desc → dif. games desc → head-to-head (wins entre las
--     parejas empatadas) → games a favor desc → pair_id. Requiere todos finished.
--   * winner_vs_loser: posiciones por PROGRESIÓN (no por puntos). Requiere la
--     ronda 2 generada y los 4 partidos finished. 1º/2º = ganador/perdedor del
--     cruce de ganadores; 3º/4º = ganador/perdedor del cruce de perdedores.
--   * manual: se cierra con freeze_manual_standings (raise USE_MANUAL_FREEZE acá).
-- ===========================================================================
create or replace function freeze_zone_standings(p_zone_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tournament_id uuid;
  v_format        match_format;
  v_total   int;
  v_pending int;
  v_w_match uuid;  -- partido de ronda 2 entre ganadores
  v_l_match uuid;  -- partido de ronda 2 entre perdedores
begin
  select z.tournament_id, z.match_format
    into v_tournament_id, v_format
  from zones z where z.id = p_zone_id;
  if not found then raise exception 'ZONE_NOT_FOUND'; end if;
  if not owns_tournament(v_tournament_id) then raise exception 'NOT_OWNER'; end if;

  if v_format = 'manual' then raise exception 'USE_MANUAL_FREEZE'; end if;

  select count(*), count(*) filter (where status <> 'finished')
    into v_total, v_pending
  from matches where zone_id = p_zone_id;

  if coalesce(v_total, 0) = 0 then raise exception 'NO_MATCHES'; end if;
  if v_pending > 0 then raise exception 'MATCHES_PENDING'; end if;

  if v_format = 'round_robin' then
    with finished as (
      select
        m.team1_pair_id, m.team2_pair_id, m.winner_pair_id,
        coalesce((select sum((s->>0)::int) from jsonb_array_elements(m.score_detail) s), m.team1_score) as t1_games,
        coalesce((select sum((s->>1)::int) from jsonb_array_elements(m.score_detail) s), m.team2_score) as t2_games
      from matches m
      where m.zone_id = p_zone_id and m.status = 'finished'
    ),
    sides as (
      select team1_pair_id as pair_id, winner_pair_id, coalesce(t1_games,0) as gf, coalesce(t2_games,0) as ga from finished
      union all
      select team2_pair_id as pair_id, winner_pair_id, coalesce(t2_games,0) as gf, coalesce(t1_games,0) as ga from finished
    ),
    agg as (
      select
        zp.pair_id,
        (count(s.pair_id) filter (where s.winner_pair_id = zp.pair_id) * 2) as pts,
        coalesce(sum(s.gf) - sum(s.ga), 0) as diff,
        coalesce(sum(s.gf), 0) as gf
      from zone_pairs zp
      left join sides s on s.pair_id = zp.pair_id
      where zp.zone_id = p_zone_id
      group by zp.pair_id
    ),
    -- grupos de empate por (puntos, diferencia de games)
    grp as (
      select pair_id, pts, diff, gf,
        dense_rank() over (order by pts desc, diff desc) as g
      from agg
    ),
    -- head-to-head: victorias de cada pareja contra las parejas de SU mismo
    -- grupo de empate (mini-liga del resultado directo).
    h2h as (
      select gg.pair_id, count(*)::int as wins
      from grp gg
      join finished f on f.winner_pair_id = gg.pair_id
      join grp opp
        on opp.g = gg.g
       and opp.pair_id = case when f.team1_pair_id = gg.pair_id
                              then f.team2_pair_id else f.team1_pair_id end
      group by gg.pair_id
    ),
    ranked as (
      select
        a.pair_id, a.pts,
        row_number() over (
          order by a.pts desc, a.diff desc, coalesce(h.wins, 0) desc, a.gf desc, a.pair_id
        ) as pos
      from agg a
      left join h2h h on h.pair_id = a.pair_id
    )
    update zone_pairs zp
      set position = r.pos, points = r.pts
    from ranked r
    where zp.zone_id = p_zone_id and zp.pair_id = r.pair_id;

  else
    -- winner_vs_loser: exige ronda 2 generada (4 partidos en total).
    if v_total <> 4 then raise exception 'ROUND2_PENDING'; end if;

    -- Identifica los cruces de ronda 2 por CONTENIDO (no por id, que es aleatorio):
    -- el cruce de ganadores tiene a ambos ganadores de la ronda 1; el otro es el
    -- de perdedores.
    declare
      v_winners uuid[];
    begin
      select array_agg(winner_pair_id)
        into v_winners
      from matches where zone_id = p_zone_id and round = 1;

      select id into v_w_match from matches
        where zone_id = p_zone_id and round = 2
          and team1_pair_id = any(v_winners)
          and team2_pair_id = any(v_winners);
      select id into v_l_match from matches
        where zone_id = p_zone_id and round = 2 and id <> v_w_match;
    end;

    -- Puntos = victorias * 2 (informativo); las posiciones salen de la progresión.
    update zone_pairs zp
      set points = (
        select count(*) filter (where m.winner_pair_id = zp.pair_id) * 2
        from matches m
        where m.zone_id = p_zone_id
          and zp.pair_id in (m.team1_pair_id, m.team2_pair_id)
      )
    where zp.zone_id = p_zone_id;

    -- 1º = ganador del cruce de ganadores; 2º = su rival.
    update zone_pairs set position = 1
      where zone_id = p_zone_id
        and pair_id = (select winner_pair_id from matches where id = v_w_match);
    update zone_pairs set position = 2
      where zone_id = p_zone_id
        and pair_id = (select case when winner_pair_id = team1_pair_id
                                   then team2_pair_id else team1_pair_id end
                       from matches where id = v_w_match);
    -- 3º = ganador del cruce de perdedores; 4º = su rival.
    update zone_pairs set position = 3
      where zone_id = p_zone_id
        and pair_id = (select winner_pair_id from matches where id = v_l_match);
    update zone_pairs set position = 4
      where zone_id = p_zone_id
        and pair_id = (select case when winner_pair_id = team1_pair_id
                                   then team2_pair_id else team1_pair_id end
                       from matches where id = v_l_match);
  end if;

  update zones set standings_frozen = true where id = p_zone_id;
end;
$$;

revoke execute on function freeze_zone_standings(uuid) from public, anon;
grant  execute on function freeze_zone_standings(uuid) to authenticated;

-- ===========================================================================
-- freeze_manual_standings — congela posiciones fijadas a mano por el organizador.
-- p_pair_ids es el orden final (índice 1 = 1º puesto). Valida que sea una
-- permutación exacta de las parejas de la zona. Si hay partidos, deben estar
-- todos 'finished'. Puntos = victorias * 2 (informativo).
-- ===========================================================================
create or replace function freeze_manual_standings(p_zone_id uuid, p_pair_ids uuid[])
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tournament_id uuid;
  v_format        match_format;
  v_pending       int;
  v_zone_count    int;
  v_match_count   int;
  i               int;
begin
  select z.tournament_id, z.match_format
    into v_tournament_id, v_format
  from zones z where z.id = p_zone_id;
  if not found then raise exception 'ZONE_NOT_FOUND'; end if;
  if not owns_tournament(v_tournament_id) then raise exception 'NOT_OWNER'; end if;
  if v_format <> 'manual' then raise exception 'WRONG_FORMAT'; end if;

  select count(*) filter (where status <> 'finished')
    into v_pending
  from matches where zone_id = p_zone_id;
  if v_pending > 0 then raise exception 'MATCHES_PENDING'; end if;

  -- p_pair_ids debe ser una permutación exacta de las parejas de la zona.
  select count(*) into v_zone_count from zone_pairs where zone_id = p_zone_id;
  if coalesce(array_length(p_pair_ids, 1), 0) <> v_zone_count then
    raise exception 'MANUAL_POSITIONS_INVALID';
  end if;
  if exists (
    select 1 from unnest(p_pair_ids) x(pair_id)
    where not exists (
      select 1 from zone_pairs zp
      where zp.zone_id = p_zone_id and zp.pair_id = x.pair_id
    )
  ) then
    raise exception 'MANUAL_POSITIONS_INVALID';
  end if;
  -- sin duplicados
  if (select count(distinct x) from unnest(p_pair_ids) x) <> v_zone_count then
    raise exception 'MANUAL_POSITIONS_INVALID';
  end if;

  -- Puntos = victorias * 2 (si hay partidos cargados).
  update zone_pairs zp
    set points = coalesce((
      select count(*) filter (where m.winner_pair_id = zp.pair_id) * 2
      from matches m
      where m.zone_id = p_zone_id
        and zp.pair_id in (m.team1_pair_id, m.team2_pair_id)
    ), 0)
  where zp.zone_id = p_zone_id;

  for i in 1 .. v_zone_count loop
    update zone_pairs set position = i
      where zone_id = p_zone_id and pair_id = p_pair_ids[i];
  end loop;

  update zones set standings_frozen = true where id = p_zone_id;
end;
$$;

revoke execute on function freeze_manual_standings(uuid, uuid[]) from public, anon;
grant  execute on function freeze_manual_standings(uuid, uuid[]) to authenticated;

-- ===========================================================================
-- move_pair_to_zone (REDEFINIDA) — al mover una pareja, ambas zonas vuelven a
-- round_robin: cambió la cantidad de parejas, así que un formato wvl/manual
-- quedaría inconsistente. El organizador re-elige formato luego si quiere.
-- ===========================================================================
create or replace function move_pair_to_zone(p_pair_id uuid, p_target_zone_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tournament_id  uuid;
  v_published      boolean;
  v_source_zone_id uuid;
begin
  select tournament_id, is_published
    into v_tournament_id, v_published
  from zones
  where id = p_target_zone_id;

  if not found then raise exception 'ZONE_NOT_FOUND'; end if;
  if not owns_tournament(v_tournament_id) then raise exception 'NOT_OWNER'; end if;
  if v_published then raise exception 'ZONES_PUBLISHED'; end if;

  select zp.zone_id
    into v_source_zone_id
  from zone_pairs zp
  join zones z on z.id = zp.zone_id
  where zp.pair_id = p_pair_id and z.tournament_id = v_tournament_id;

  if not found then raise exception 'PAIR_NOT_IN_ZONES'; end if;
  if v_source_zone_id = p_target_zone_id then return; end if;

  update zone_pairs
    set zone_id = p_target_zone_id
  where pair_id = p_pair_id and zone_id = v_source_zone_id;

  -- Reorganizar parejas revierte ambas zonas a round_robin y limpia posiciones.
  update zones
    set match_format = 'round_robin', standings_frozen = false
  where id in (v_source_zone_id, p_target_zone_id);
  update zone_pairs
    set position = null, points = 0
  where zone_id in (v_source_zone_id, p_target_zone_id);

  perform _zone_round_robin(v_source_zone_id);
  perform _zone_round_robin(p_target_zone_id);
end;
$$;

revoke execute on function move_pair_to_zone(uuid, uuid) from public;
grant  execute on function move_pair_to_zone(uuid, uuid) to authenticated;
