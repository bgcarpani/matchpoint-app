-- Matchpoint App — v2 (Feature 3) Resultados / scoring de partidos
-- Ref: spec-v2.md "Feature 3 — Resultados / scoring de partidos"
--
-- Delta sobre v1:
--   * tournaments: configuración de scoring por torneo (scoring_mode + games_per_set).
--     Se fija al crear/editar (en la app la edición es sólo en borrador → queda
--     bloqueado de hecho una vez publicado/in_progress).
--   * matches: se activan los campos de resultado. team1_score/team2_score ya
--     existían (reservados en v1); se suman score_detail (desglose por set en
--     best_of_3_sets) y winner_pair_id (se setea al finalizar el partido).
--
-- El registro/corrección de resultados NO usa RPC: es una server action del
-- organizador (requireUser + RLS matches_all_owner), que valida estado del
-- torneo y reglas de scoring en TypeScript (ver record_match_result). El
-- recálculo de standings de zona es derivado (vista en vivo, Feature 4): basta
-- con actualizar el match.

-- ---------------------------------------------------------------------------
-- Enum de modo de scoring
-- ---------------------------------------------------------------------------
create type scoring_mode as enum ('games', 'best_of_3_sets');

-- ---------------------------------------------------------------------------
-- Tournament (delta)
--   scoring_mode  : 'games' (1 set a N games) | 'best_of_3_sets'
--   games_per_set : largo del set (6 o 7); aplica a ambos modos
-- ---------------------------------------------------------------------------
alter table tournaments
  add column scoring_mode  scoring_mode not null default 'games',
  add column games_per_set integer      not null default 6
    constraint tournaments_games_per_set_valid check (games_per_set in (6, 7));

-- ---------------------------------------------------------------------------
-- Match (delta)
--   score_detail   : jsonb con el desglose por set en best_of_3_sets
--                    (ej. [[6,4],[3,6],[7,5]]); null en modo games.
--   winner_pair_id : pareja ganadora, se setea al finalizar el partido.
-- (team1_score/team2_score ya existían; en best_of_3_sets guardan SETS ganados.)
-- ---------------------------------------------------------------------------
alter table matches
  add column score_detail   jsonb,
  add column winner_pair_id uuid references pairs (id) on delete set null;
