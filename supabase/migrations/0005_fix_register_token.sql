-- MatchUp App — fix: generación de lookup_token en register_pair
--
-- `gen_random_bytes` (pgcrypto) vive en el schema `extensions` de Supabase y no
-- es visible con `search_path = public`. Generamos el token con gen_random_uuid()
-- (disponible en public), sin guiones → 32 chars hex, que es lo que valida la app.

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
