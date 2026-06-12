-- Matchpoint App — v1 (MVP) Zonas y partidos (Zones & Matches)
-- Ref: spec.md "Gestión de zonas" + "Asignación de canchas a partidos"
--
-- Estrategia (coherente con 0002/0004):
--   * Las tablas zones/zone_pairs/matches y su RLS ya existen (0001/0002): el
--     organizador (rol authenticated) gestiona vía su cliente con RLS, y la
--     superficie pública sale por las vistas seguras + la política *_select_public
--     (visible sólo cuando la zona está publicada).
--   * La GENERACIÓN de zonas y la REASIGNACIÓN de parejas son operaciones
--     multi-paso (parejas + partidos round-robin) que conviene hacer atómicas e
--     idempotentes dentro de la base → RPCs SECURITY DEFINER con chequeo de
--     propiedad (owns_tournament), llamadas por el cliente authenticated del
--     organizador (mismo patrón que remove_pair en 0004).
--   * Publicar zonas y asignar cancha a un partido son updates simples que la RLS
--     del dueño ya permite → se hacen desde la server action con el cliente
--     authenticated, sin RPC.

-- ===========================================================================
-- Helper interno: (re)genera los partidos round-robin de UNA zona.
-- ---------------------------------------------------------------------------
-- Borra los partidos existentes de la zona y crea uno por cada par no ordenado
-- de parejas de la zona (todas contra todas). `round` es un ordinal secuencial
-- (en v1 sólo ordena; el scheduling fino de rondas se afina en v2).
-- No se otorga a nadie: sólo lo invocan las RPCs SECURITY DEFINER de abajo.
-- ===========================================================================
create or replace function _zone_round_robin(p_zone_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from matches where zone_id = p_zone_id;

  insert into matches (zone_id, round, team1_pair_id, team2_pair_id)
  select
    p_zone_id,
    (row_number() over (order by a.pair_id, b.pair_id))::int,
    a.pair_id,
    b.pair_id
  from zone_pairs a
  join zone_pairs b
    on b.zone_id = a.zone_id and a.pair_id < b.pair_id
  where a.zone_id = p_zone_id;
end;
$$;

revoke execute on function _zone_round_robin(uuid) from public, anon, authenticated;

-- ===========================================================================
-- generate_zones — distribuye las parejas aceptadas al azar en N zonas y crea
-- los partidos round-robin de cada zona. Idempotente: borra cualquier zona
-- previa NO publicada del torneo y la rehace (regenerar = volver a llamar).
-- ===========================================================================
create or replace function generate_zones(p_tournament_id uuid, p_num_zones int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status   tournament_status;
  v_accepted int;
  v_zone_ids uuid[] := array[]::uuid[];
  v_zone_id  uuid;
  v_i        int;
  r          record;
begin
  if not owns_tournament(p_tournament_id) then
    raise exception 'NOT_OWNER';
  end if;

  select status into v_status from tournaments where id = p_tournament_id;
  if not found then
    raise exception 'TOURNAMENT_NOT_FOUND';
  end if;
  -- Sólo se generan zonas con la inscripción cerrada o el torneo en curso.
  if v_status not in ('registration_closed', 'in_progress') then
    raise exception 'INVALID_STATUS';
  end if;

  -- Una vez publicadas, las zonas no se regeneran.
  if exists (
    select 1 from zones where tournament_id = p_tournament_id and is_published
  ) then
    raise exception 'ZONES_PUBLISHED';
  end if;

  if p_num_zones < 1 then
    raise exception 'INVALID_ZONE_COUNT';
  end if;

  select count(*) into v_accepted
  from pairs
  where tournament_id = p_tournament_id and status = 'accepted';

  if v_accepted < 2 then
    raise exception 'NOT_ENOUGH_PAIRS';
  end if;
  if p_num_zones > v_accepted then
    raise exception 'TOO_MANY_ZONES';
  end if;

  -- Limpia zonas previas (cascade borra zone_pairs y matches).
  delete from zones where tournament_id = p_tournament_id;

  -- Crea las zonas: "Zona A", "Zona B", …
  for v_i in 1..p_num_zones loop
    insert into zones (tournament_id, name)
      values (p_tournament_id, 'Zona ' || chr(64 + v_i))
      returning id into v_zone_id;
    v_zone_ids := array_append(v_zone_ids, v_zone_id);
  end loop;

  -- Reparte las parejas aceptadas al azar, round-robin entre zonas
  -- (así quedan equilibradas: diferencia máxima de 1 pareja entre zonas).
  v_i := 0;
  for r in
    select id from pairs
    where tournament_id = p_tournament_id and status = 'accepted'
    order by random()
  loop
    insert into zone_pairs (zone_id, pair_id)
      values (v_zone_ids[(v_i % p_num_zones) + 1], r.id);
    v_i := v_i + 1;
  end loop;

  -- Genera los partidos round-robin de cada zona.
  foreach v_zone_id in array v_zone_ids loop
    perform _zone_round_robin(v_zone_id);
  end loop;
end;
$$;

revoke execute on function generate_zones(uuid, int) from public;
grant  execute on function generate_zones(uuid, int) to authenticated;

-- ===========================================================================
-- move_pair_to_zone — reasigna una pareja a otra zona (antes de publicar) y
-- regenera los partidos round-robin de la zona origen y la destino.
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

  if not found then
    raise exception 'ZONE_NOT_FOUND';
  end if;
  if not owns_tournament(v_tournament_id) then
    raise exception 'NOT_OWNER';
  end if;
  if v_published then
    raise exception 'ZONES_PUBLISHED';
  end if;

  -- Zona actual de la pareja dentro del mismo torneo.
  select zp.zone_id
    into v_source_zone_id
  from zone_pairs zp
  join zones z on z.id = zp.zone_id
  where zp.pair_id = p_pair_id and z.tournament_id = v_tournament_id;

  if not found then
    raise exception 'PAIR_NOT_IN_ZONES';
  end if;
  if v_source_zone_id = p_target_zone_id then
    return;
  end if;

  update zone_pairs
    set zone_id = p_target_zone_id
  where pair_id = p_pair_id and zone_id = v_source_zone_id;

  perform _zone_round_robin(v_source_zone_id);
  perform _zone_round_robin(p_target_zone_id);
end;
$$;

revoke execute on function move_pair_to_zone(uuid, uuid) from public;
grant  execute on function move_pair_to_zone(uuid, uuid) to authenticated;

-- ===========================================================================
-- public_court_view — se redefine para incluir tournament_id, de modo que la
-- página pública del torneo pueda listar las canchas "en juego" (las asignadas
-- a partidos de zonas publicadas) filtrando por torneo.
-- ===========================================================================
drop view if exists public_court_view;
create view public_court_view as
  select distinct c.id, c.name, c.type, z.tournament_id
  from courts c
  join matches m on m.court_id = c.id
  join zones z on z.id = m.zone_id and z.is_published;

grant select on public_court_view to anon, authenticated;
