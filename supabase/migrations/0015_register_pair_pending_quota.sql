-- MatchUp App — v2 mejora: el cupo de solicitudes cuenta SOLO pendientes.
--
-- Cambio de semántica pedido por el organizador: `max_pair_requests` era una
-- lista de espera que contaba `pending + accepted`, así que aceptar una pareja
-- NO liberaba lugar para nuevas solicitudes. Ahora el cupo de solicitudes es una
-- cola de PENDIENTES: aceptar o rechazar una pareja libera espacio para que entre
-- otra. El cupo real del torneo lo sigue topeando `max_pairs` sobre `accepted`
-- (en la action acceptPair).
--
-- Delta sobre 0010 (register_pair con dedup) y 0004 (public_tournament_view):
--   * register_pair: el conteo de cupo pasa de `status in ('pending','accepted')`
--     a `status = 'pending'`. El resto (lock FOR UPDATE, dedup por email, tokens)
--     queda igual. `create or replace` preserva los grants de 0006/0010.
--   * public_tournament_view: `requested_pairs` pasa a contar solo pendientes,
--     para que `requestsFull` en la página pública use la misma regla.

-- ===========================================================================
-- register_pair — cupo = pendientes
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

  -- Cupo de solicitudes = parejas PENDIENTES (aceptar/rechazar libera lugar).
  select count(*)
    into v_current
  from pairs
  where tournament_id = p_tournament_id
    and status = 'pending';

  if v_current >= v_max_requests then
    raise exception 'REQUESTS_FULL';
  end if;

  -- Anti-duplicado por email (igual que 0010): alguno de los dos emails entrantes
  -- ya integra una pareja pending/accepted del torneo.
  if exists (
    select 1
    from pairs p
    join players pl on pl.id in (p.player1_id, p.player2_id)
    where p.tournament_id = p_tournament_id
      and p.status in ('pending', 'accepted')
      and pl.email is not null
      and lower(trim(pl.email)) in (
        nullif(lower(trim(p1_email)), ''),
        nullif(lower(trim(p2_email)), '')
      )
  ) then
    raise exception 'DUPLICATE_EMAIL';
  end if;

  insert into players (full_name, email, phone, dni)
    values (p1_full_name, nullif(p1_email, ''), nullif(p1_phone, ''), nullif(p1_dni, ''))
    returning id into v_p1;
  insert into players (full_name, email, phone, dni)
    values (p2_full_name, nullif(p2_email, ''), nullif(p2_phone, ''), nullif(p2_dni, ''))
    returning id into v_p2;

  v_token := replace(gen_random_uuid()::text, '-', '');

  insert into pairs (tournament_id, player1_id, player2_id, lookup_token)
    values (p_tournament_id, v_p1, v_p2, v_token);

  return v_token;
end;
$$;

-- ===========================================================================
-- public_tournament_view — requested_pairs = solo pendientes
-- ===========================================================================
create or replace view public_tournament_view as
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
      count(*) filter (where p.status = 'accepted') as accepted_pairs,
      count(*) filter (where p.status = 'pending')  as requested_pairs
    from pairs p
    where p.tournament_id = t.id
  ) pc on true
  where t.status <> 'draft';

grant select on public_tournament_view to anon, authenticated;
