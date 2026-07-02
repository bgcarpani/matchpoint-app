-- MatchUp App — v1 (MVP) Row Level Security
-- Ref: spec.md "Reglas de negocio"
--
-- Estrategia:
--   * RLS estricta: el cliente del navegador (publishable/anon key + sesión)
--     sólo puede leer/escribir lo que le corresponde al organizador autenticado.
--   * La superficie PÚBLICA (vista pública del torneo y de zonas) se expone por
--     VISTAS de columnas seguras (sin lookup_token, sin email/phone/dni, sin
--     email del organizador). Las vistas filtran a contenido publicado y se
--     otorgan a anon/authenticated. Esto evita que la anon key —que viaja al
--     navegador— pueda leer columnas sensibles directamente vía PostgREST.
--   * Las mutaciones públicas (inscripción de pareja) y la consulta por
--     lookup_token se manejan server-side con el cliente secret/service-role
--     (admin), que bypassea RLS de forma controlada. Por eso aquí no hay
--     políticas INSERT para anon.

-- Helper: ¿el usuario autenticado es dueño del torneo?
create or replace function owns_tournament(t_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from tournaments t
    where t.id = t_id and t.organizer_id = auth.uid()
  );
$$;

-- ---------------------------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------------------------
alter table organizers  enable row level security;
alter table courts      enable row level security;
alter table tournaments enable row level security;
alter table players     enable row level security;
alter table pairs       enable row level security;
alter table zones       enable row level security;
alter table zone_pairs  enable row level security;
alter table matches     enable row level security;

-- ===========================================================================
-- Políticas del ORGANIZADOR (acceso autenticado a sus propios datos)
-- ===========================================================================

-- Organizers — cada uno gestiona su propia fila
create policy organizers_select_own on organizers
  for select using (id = auth.uid());

create policy organizers_insert_self on organizers
  for insert with check (id = auth.uid());

create policy organizers_update_own on organizers
  for update using (id = auth.uid()) with check (id = auth.uid());

-- Courts — CRUD del dueño
create policy courts_all_own on courts
  for all
  using (organizer_id = auth.uid())
  with check (organizer_id = auth.uid());

-- Tournaments — CRUD del dueño + lectura pública si no es borrador.
-- (tournaments no tiene PII: es seguro exponer la fila completa.)
create policy tournaments_all_own on tournaments
  for all
  using (organizer_id = auth.uid())
  with check (organizer_id = auth.uid());

create policy tournaments_public_read on tournaments
  for select
  to anon, authenticated
  using (status <> 'draft');

-- Players — sólo el organizador dueño los lee (NO hay acceso público directo:
-- los nombres públicos salen por la vista public_pair_view).
create policy players_select_owner on players
  for select using (
    exists (
      select 1 from pairs p
      where (p.player1_id = players.id or p.player2_id = players.id)
        and owns_tournament(p.tournament_id)
    )
  );

-- Pairs — el organizador gestiona. SIN política pública: la anon key NO puede
-- leer lookup_token/columnas de pares directamente.
create policy pairs_all_owner on pairs
  for all
  using (owns_tournament(tournament_id))
  with check (owns_tournament(tournament_id));

-- Zones — el organizador gestiona; lectura pública si publicada (sin PII).
create policy zones_all_owner on zones
  for all
  using (owns_tournament(tournament_id))
  with check (owns_tournament(tournament_id));

create policy zones_select_public on zones
  for select
  to anon, authenticated
  using (is_published);

-- ZonePairs — gestionado por el dueño de la zona; público si zona publicada.
-- (Sólo contiene zone_id/pair_id/position/points → sin PII.)
create policy zone_pairs_all_owner on zone_pairs
  for all
  using (
    exists (
      select 1 from zones z
      where z.id = zone_pairs.zone_id and owns_tournament(z.tournament_id)
    )
  )
  with check (
    exists (
      select 1 from zones z
      where z.id = zone_pairs.zone_id and owns_tournament(z.tournament_id)
    )
  );

create policy zone_pairs_select_public on zone_pairs
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from zones z
      where z.id = zone_pairs.zone_id and z.is_published
    )
  );

-- Matches — gestionado por el dueño de la zona; público si zona publicada.
-- (court_id es sólo un id; el nombre de la cancha sale por public_court_view.)
create policy matches_all_owner on matches
  for all
  using (
    exists (
      select 1 from zones z
      where z.id = matches.zone_id and owns_tournament(z.tournament_id)
    )
  )
  with check (
    exists (
      select 1 from zones z
      where z.id = matches.zone_id and owns_tournament(z.tournament_id)
    )
  );

create policy matches_select_public on matches
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from zones z
      where z.id = matches.zone_id and z.is_published
    )
  );

-- ===========================================================================
-- VISTAS PÚBLICAS de columnas seguras
-- ---------------------------------------------------------------------------
-- Se crean con security_invoker = off (default): corren como el dueño (postgres)
-- y bypassean la RLS de las tablas base, por eso el FILTRO de "publicado/no
-- borrador" va en el WHERE de cada vista. Exponen únicamente columnas no
-- sensibles y se otorgan a anon/authenticated.
-- ===========================================================================

-- Nombre del establecimiento del organizador (sin email) para torneos visibles.
create view public_organizer_view as
  select o.id, o.establishment_name
  from organizers o
  where exists (
    select 1 from tournaments t
    where t.organizer_id = o.id and t.status <> 'draft'
  );

-- Parejas de zonas publicadas: estado + nombres de ambos jugadores.
-- NO expone lookup_token ni email/phone/dni.
create view public_pair_view as
  select
    p.id,
    p.tournament_id,
    p.status,
    p.player1_id,
    p.player2_id,
    pl1.full_name as player1_name,
    pl2.full_name as player2_name
  from pairs p
  join players pl1 on pl1.id = p.player1_id
  join players pl2 on pl2.id = p.player2_id
  where exists (
    select 1
    from zone_pairs zp
    join zones z on z.id = zp.zone_id
    where zp.pair_id = p.id and z.is_published
  );

-- Canchas asignadas a partidos de zonas publicadas: sólo nombre y tipo.
create view public_court_view as
  select distinct c.id, c.name, c.type
  from courts c
  where exists (
    select 1
    from matches m
    join zones z on z.id = m.zone_id
    where m.court_id = c.id and z.is_published
  );

grant select on public_organizer_view to anon, authenticated;
grant select on public_pair_view     to anon, authenticated;
grant select on public_court_view    to anon, authenticated;
