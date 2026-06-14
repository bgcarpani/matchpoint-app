-- Matchpoint App — v2 mejora: eliminar un torneo en cualquier estado.
--
-- Antes el borrado se permitía solo en 'draft' y corría como un DELETE directo,
-- que por las FKs deja players huérfanos (pairs → tournament es ON DELETE
-- CASCADE, pero players no cuelga del torneo). Este RPC SECURITY DEFINER borra
-- el torneo en cualquier estado y limpia los players asociados, atómicamente.
--
-- Los players nunca se comparten entre parejas/torneos: register_pair inserta
-- players nuevos por cada inscripción (igual que asume remove_pair en 0004). Por
-- eso es seguro borrar todos los players de las parejas del torneo.

create or replace function delete_tournament(p_tournament_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player_ids uuid[];
begin
  if not owns_tournament(p_tournament_id) then
    raise exception 'NOT_OWNER';
  end if;

  -- Junta los players de todas las parejas del torneo ANTES de borrar (el delete
  -- del torneo cascadea a pairs, así que después ya no se podrían enumerar).
  select array_agg(id)
    into v_player_ids
  from (
    select player1_id as id from pairs where tournament_id = p_tournament_id
    union
    select player2_id as id from pairs where tournament_id = p_tournament_id
  ) ids;

  -- Borra el torneo: cascadea a pairs, zones, zone_pairs y matches.
  delete from tournaments where id = p_tournament_id;

  -- Limpia los players que quedaron sin referencia.
  if v_player_ids is not null then
    delete from players where id = any(v_player_ids);
  end if;
end;
$$;

revoke execute on function delete_tournament(uuid) from public, anon;
grant  execute on function delete_tournament(uuid) to authenticated;
