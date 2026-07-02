-- MatchUp App — v1: alta automática de Organizer al registrarse en Auth
--
-- Al hacer signUp, Supabase crea una fila en auth.users. Este trigger crea la
-- fila correspondiente en public.organizers, leyendo full_name y
-- establishment_name de la metadata del usuario (options.data del signUp).
--
-- SECURITY DEFINER → corre como owner (postgres) y bypassea RLS, así el alta
-- funciona sin importar el timing de confirmación de email.
--
-- Nota v1: sólo se registran organizadores. En v4 (login de Player) habrá que
-- diferenciar el tipo de usuario antes de insertar en organizers.

create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.organizers (id, email, full_name, establishment_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'establishment_name', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function handle_new_user();
