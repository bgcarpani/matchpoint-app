-- Matchpoint App — v2 Slice 4 (núcleo): Standings de zona + groundwork de formatos
-- Ref: spec-v2.md "Feature 4 — Formatos de partido por zona + standings"
--
-- Cubre el NÚCLEO del slice 4:
--   * Columnas nuevas en zones: match_format (enum) y standings_frozen.
--   * Vista zone_standings_view: posiciones en vivo computadas desde matches
--     (jugados/ganados/perdidos, games a favor/en contra, diferencia, puntos).
--   * RPCs freeze_zone_standings / reopen_zone_standings: congelan/reabren las
--     posiciones de una zona (escriben position/points en zone_pairs).
--
-- Los formatos winner_vs_loser y manual (y sus RPCs generate_zone_matches /
-- generate_next_zone_round) van en un slice posterior; acá match_format queda
-- con default 'round_robin' (único formato que genera la RPC de v1).

-- ---------------------------------------------------------------------------
-- Enum + columnas de zone
-- ---------------------------------------------------------------------------
create type match_format as enum ('round_robin', 'winner_vs_loser', 'manual');

alter table zones
  add column match_format     match_format not null default 'round_robin',
  add column standings_frozen boolean      not null default false;

-- ===========================================================================
-- zone_standings_view — posiciones en vivo de cada zona, computadas desde
-- matches finished. NO asigna posición final (eso lo congela freeze_*); expone
-- las métricas para ordenar en vivo (puntos → dif. de games).
-- ---------------------------------------------------------------------------
-- security_invoker = true → respeta la RLS del rol que consulta:
--   * organizador (authenticated): zone_pairs_all_owner + matches_all_owner →
--     ve los standings de SUS zonas (publicadas o no).
--   * anon: *_select_public → sólo zonas publicadas.
-- Sólo expone ids + conteos (sin PII); los nombres salen por public_pair_view.
-- Games por lado: en best_of_3_sets se suman desde score_detail (games por set);
-- en modo games (1 set) salen de team1_score/team2_score.
-- ===========================================================================
create view zone_standings_view
  with (security_invoker = true)
as
with finished as (
  select
    m.zone_id,
    m.team1_pair_id,
    m.team2_pair_id,
    m.winner_pair_id,
    coalesce(
      (select sum((s->>0)::int) from jsonb_array_elements(m.score_detail) s),
      m.team1_score
    ) as t1_games,
    coalesce(
      (select sum((s->>1)::int) from jsonb_array_elements(m.score_detail) s),
      m.team2_score
    ) as t2_games
  from matches m
  where m.zone_id is not null and m.status = 'finished'
),
sides as (
  select zone_id, team1_pair_id as pair_id, winner_pair_id,
         coalesce(t1_games, 0) as gf, coalesce(t2_games, 0) as ga
  from finished
  union all
  select zone_id, team2_pair_id as pair_id, winner_pair_id,
         coalesce(t2_games, 0) as gf, coalesce(t1_games, 0) as ga
  from finished
)
select
  zp.zone_id,
  zp.pair_id,
  count(s.pair_id)::int as played,
  count(s.pair_id) filter (where s.winner_pair_id = zp.pair_id)::int as won,
  (count(s.pair_id)
     - count(s.pair_id) filter (where s.winner_pair_id = zp.pair_id))::int as lost,
  coalesce(sum(s.gf), 0)::int as games_for,
  coalesce(sum(s.ga), 0)::int as games_against,
  coalesce(sum(s.gf) - sum(s.ga), 0)::int as games_diff,
  (count(s.pair_id) filter (where s.winner_pair_id = zp.pair_id) * 2)::int as points
from zone_pairs zp
left join sides s on s.zone_id = zp.zone_id and s.pair_id = zp.pair_id
group by zp.zone_id, zp.pair_id;

grant select on zone_standings_view to anon, authenticated;

-- ===========================================================================
-- freeze_zone_standings — congela las posiciones de una zona. Recalcula puntos
-- (victoria = 2) y asigna position 1..N ordenando por puntos → dif. de games →
-- games a favor (desempate determinístico; head-to-head/manual llegan con el
-- formato manual). Requiere TODOS los partidos de la zona en 'finished'.
-- ===========================================================================
create or replace function freeze_zone_standings(p_zone_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tournament_id uuid;
  v_total   int;
  v_pending int;
begin
  select tournament_id into v_tournament_id from zones where id = p_zone_id;
  if not found then raise exception 'ZONE_NOT_FOUND'; end if;
  if not owns_tournament(v_tournament_id) then raise exception 'NOT_OWNER'; end if;

  select count(*), count(*) filter (where status <> 'finished')
    into v_total, v_pending
  from matches where zone_id = p_zone_id;

  if coalesce(v_total, 0) = 0 then raise exception 'NO_MATCHES'; end if;
  if v_pending > 0 then raise exception 'MATCHES_PENDING'; end if;

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
  ranked as (
    select
      pair_id, pts,
      row_number() over (order by pts desc, diff desc, gf desc, pair_id) as pos
    from agg
  )
  update zone_pairs zp
    set position = r.pos, points = r.pts
  from ranked r
  where zp.zone_id = p_zone_id and zp.pair_id = r.pair_id;

  update zones set standings_frozen = true where id = p_zone_id;
end;
$$;

revoke execute on function freeze_zone_standings(uuid) from public, anon;
grant  execute on function freeze_zone_standings(uuid) to authenticated;

-- ===========================================================================
-- reopen_zone_standings — reabre las posiciones (para corregir resultados).
-- Limpia position; los puntos se recalculan al volver a congelar.
-- ===========================================================================
create or replace function reopen_zone_standings(p_zone_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tournament_id uuid;
begin
  select tournament_id into v_tournament_id from zones where id = p_zone_id;
  if not found then raise exception 'ZONE_NOT_FOUND'; end if;
  if not owns_tournament(v_tournament_id) then raise exception 'NOT_OWNER'; end if;

  update zone_pairs set position = null where zone_id = p_zone_id;
  update zones set standings_frozen = false where id = p_zone_id;
end;
$$;

revoke execute on function reopen_zone_standings(uuid) from public, anon;
grant  execute on function reopen_zone_standings(uuid) to authenticated;
