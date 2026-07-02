-- MatchUp App — v2 (Feature 2) Anti-duplicado de inscripción por email
-- Ref: spec-v2.md "Feature 2 — Anti-duplicado de inscripción por email"
--
-- Delta sobre 0004/0005: `register_pair` rechaza la inscripción si el email de
-- CUALQUIERA de los dos jugadores ya integra una pareja pending/accepted del
-- MISMO torneo (comparación case-insensitive + trim). El chequeo vive dentro
-- del RPC (SECURITY DEFINER, atómico): el `for update` sobre el torneo —que ya
-- serializaba el cupo— también serializa el dedup, evitando que dos envíos
-- simultáneos con el mismo email pasen ambos.
--
-- Reglas (spec-v2):
--   * `rejected` NO bloquea (puede re-inscribirse). Teléfono NO se chequea.
--   * Jugador sin email no es bloqueado. Alcance por torneo.
--   * El mismo email puede inscribirse en OTRO torneo.
--   * (La regla "los dos emails de la misma solicitud no pueden ser iguales"
--      se valida en la app —schema + form—, no acá.)
--
-- No se expresa como UNIQUE en la base: Player es global (no scopeado por
-- torneo) y la unicidad pedida depende del join pairs→players y del status.

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

  select count(*)
    into v_current
  from pairs
  where tournament_id = p_tournament_id
    and status in ('pending', 'accepted');

  if v_current >= v_max_requests then
    raise exception 'REQUESTS_FULL';
  end if;

  -- Anti-duplicado por email: alguno de los dos emails entrantes ya integra
  -- una pareja pending/accepted del torneo. Los nullif() descartan emails
  -- vacíos del lado entrante; el `pl.email is not null` descarta del lado
  -- existente. IN con NULLs nunca matchea → jugador sin email no bloquea.
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
