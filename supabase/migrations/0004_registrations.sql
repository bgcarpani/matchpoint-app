-- MatchUp App — v1 (MVP) Inscripciones (Registrations)
-- Ref: spec.md "Gestión de inscripciones"
--
-- Estrategia (coherente con 0002):
--   * La superficie PÚBLICA se expone por VISTAS de columnas seguras + RPCs
--     SECURITY DEFINER que validan reglas adentro de la base.
--   * `public_tournament_view`: la página pública /t/[id] lee de acá. Incluye los
--     conteos de parejas (sin exponer filas de pairs/players a anon).
--   * `register_pair`: inscripción pública atómica. Bloquea la fila del torneo
--     (FOR UPDATE) para serializar el chequeo de cupo. Sólo server-side (admin).
--   * `remove_pair`: el organizador borra una pareja y sus players, con chequeo
--     de propiedad. Llamada por el cliente autenticado.

-- ===========================================================================
-- Vista pública del torneo (info + conteos de parejas)
-- ---------------------------------------------------------------------------
-- security_invoker off (default): corre como owner y bypassea RLS de las tablas
-- base; el filtro de visibilidad (status <> 'draft') va en el WHERE.
-- accepted_pairs  = parejas aceptadas        (ocupan cupo de torneo, max_pairs)
-- requested_pairs = pending + accepted        (ocupan lista de espera, max_pair_requests)
-- Las rechazadas liberan ambos cupos.
-- ===========================================================================
create view public_tournament_view as
  select
    t.id,
    t.name,
    t.status,
    t.category_type,
    t.category_value,
    t.gender,
    t.tournament_date,
    t.registration_opens_at,
    t.max_pairs,
    t.max_pair_requests,
    o.establishment_name,
    coalesce(pc.accepted_pairs, 0)  as accepted_pairs,
    coalesce(pc.requested_pairs, 0) as requested_pairs,
    exists (
      select 1 from zones z
      where z.tournament_id = t.id and z.is_published
    ) as zones_published
  from tournaments t
  join organizers o on o.id = t.organizer_id
  left join lateral (
    select
      count(*) filter (where p.status = 'accepted')                  as accepted_pairs,
      count(*) filter (where p.status in ('pending', 'accepted'))    as requested_pairs
    from pairs p
    where p.tournament_id = t.id
  ) pc on true
  where t.status <> 'draft';

grant select on public_tournament_view to anon, authenticated;

-- ===========================================================================
-- register_pair — inscripción pública de una pareja (atómica)
-- ---------------------------------------------------------------------------
-- Valida estado del torneo y cupo de solicitudes, inserta los dos players y la
-- pareja, y devuelve el lookup_token generado. Sólo se invoca server-side con el
-- cliente service-role (ver revoke/grant abajo).
-- ===========================================================================
create or replace function register_pair(
  p_tournament_id uuid,
  p1_full_name text, p1_email text, p1_phone text, p1_dni text,
  p2_full_name text, p2_email text, p2_phone text, p2_dni text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status       tournament_status;
  v_max_requests integer;
  v_current      integer;
  v_p1           uuid;
  v_p2           uuid;
  v_token        text;
begin
  -- Bloquea la fila del torneo para serializar el chequeo de cupo concurrente.
  select status, max_pair_requests
    into v_status, v_max_requests
  from tournaments
  where id = p_tournament_id
  for update;

  if not found then
    raise exception 'TOURNAMENT_NOT_FOUND';
  end if;
  if v_status <> 'registration_open' then
    raise exception 'REGISTRATION_CLOSED';
  end if;

  select count(*)
    into v_current
  from pairs
  where tournament_id = p_tournament_id
    and status in ('pending', 'accepted');

  if v_current >= v_max_requests then
    raise exception 'REQUESTS_FULL';
  end if;

  insert into players (full_name, email, phone, dni)
    values (p1_full_name, nullif(p1_email, ''), nullif(p1_phone, ''), nullif(p1_dni, ''))
    returning id into v_p1;
  insert into players (full_name, email, phone, dni)
    values (p2_full_name, nullif(p2_email, ''), nullif(p2_phone, ''), nullif(p2_dni, ''))
    returning id into v_p2;

  v_token := encode(gen_random_bytes(16), 'hex');

  insert into pairs (tournament_id, player1_id, player2_id, lookup_token)
    values (p_tournament_id, v_p1, v_p2, v_token);

  return v_token;
end;
$$;

-- Sólo el cliente service-role (server-side) puede inscribir; no exponer a anon.
revoke execute on function register_pair(uuid, text, text, text, text, text, text, text, text) from public;
grant  execute on function register_pair(uuid, text, text, text, text, text, text, text, text) to service_role;

-- ===========================================================================
-- remove_pair — el organizador quita una pareja y limpia sus players
-- ---------------------------------------------------------------------------
-- Chequea propiedad vía owns_tournament(auth.uid()). Borra la pareja (cascada a
-- zone_pairs/matches) y luego sus dos players para no dejar PII huérfana.
-- ===========================================================================
create or replace function remove_pair(p_pair_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tournament_id uuid;
  v_p1 uuid;
  v_p2 uuid;
begin
  select tournament_id, player1_id, player2_id
    into v_tournament_id, v_p1, v_p2
  from pairs
  where id = p_pair_id;

  if not found then
    raise exception 'PAIR_NOT_FOUND';
  end if;
  if not owns_tournament(v_tournament_id) then
    raise exception 'NOT_OWNER';
  end if;

  delete from pairs where id = p_pair_id;
  -- Los players quedan sin referencia tras borrar la pareja (en v1 no se comparten).
  delete from players where id in (v_p1, v_p2);
end;
$$;

revoke execute on function remove_pair(uuid) from public;
grant  execute on function remove_pair(uuid) to authenticated;
