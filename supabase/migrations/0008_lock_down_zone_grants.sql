-- MatchUp App — fix de seguridad: restringir EXECUTE de las RPC de zonas.
--
-- Igual que en 0006: Supabase otorga EXECUTE a anon/authenticated por DEFAULT
-- PRIVILEGES, así que el `revoke ... from public` de 0007 NO alcanzó y anon
-- conservaba su grant propio sobre generate_zones / move_pair_to_zone. Las dos
-- RPC chequean owns_tournament(auth.uid()) (anon siempre falla con NOT_OWNER),
-- pero por consistencia y defensa en profundidad revocamos de anon explícito.
--
--   generate_zones    → sólo authenticated (organizador); nunca anon.
--   move_pair_to_zone → sólo authenticated (organizador); nunca anon.

revoke execute on function generate_zones(uuid, int) from anon;
grant  execute on function generate_zones(uuid, int) to authenticated;

revoke execute on function move_pair_to_zone(uuid, uuid) from anon;
grant  execute on function move_pair_to_zone(uuid, uuid) to authenticated;
