-- Matchpoint App — v2 mejora: cancha en la vista pública de llaves.
--
-- El organizador ahora asigna cancha a los partidos de bracket (igual que en
-- zonas). Para mostrarla en la superficie pública agregamos `court_id` a
-- public_bracket_view; el nombre de la cancha sale por public_court_view
-- (sin PII). `create or replace view` preserva el grant a anon/authenticated.
--
-- Delta sobre 0014 (public_bracket_view): + columna court_id.

create or replace view public_bracket_view as
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
    m.next_slot,
    m.court_id
  from matches m
  join tournaments t on t.id = m.tournament_id
  where m.phase = 'bracket' and t.bracket_published;

grant select on public_bracket_view to anon, authenticated;
