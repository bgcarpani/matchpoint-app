-- Matchpoint App — fix de seguridad: restringir EXECUTE de las RPC.
--
-- Supabase otorga EXECUTE sobre las funciones de `public` a los roles anon /
-- authenticated vía DEFAULT PRIVILEGES, por lo que `revoke ... from public` (en
-- 0004) NO alcanza: anon conservaba su grant propio y podía llamar register_pair
-- directamente con la anon key. Revocamos de los roles explícitamente.
--
--   register_pair → sólo service_role (inscripción server-side vía admin client).
--   remove_pair   → sólo authenticated (organizador); nunca anon.

revoke execute on function register_pair(uuid, text, text, text, text, text, text, text, text)
  from anon, authenticated;
grant  execute on function register_pair(uuid, text, text, text, text, text, text, text, text)
  to service_role;

revoke execute on function remove_pair(uuid) from anon;
grant  execute on function remove_pair(uuid) to authenticated;
