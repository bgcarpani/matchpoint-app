-- Limpieza automática del tablero de turnos (`/turnos`).
--
-- Regla de producto: un turno se considera CERRADO en cuanto pasó su horario (con
-- la misma gracia de 30 min que usa el read-filter de la lista), y TODOS los turnos
-- cerrados se borran solos. Así el tablero queda siempre limpio, sin intervención
-- manual. Ver `spec-turnos.md` → "Auto-cierre y limpieza automática".
--
-- Enfoque: pg_cron (corre EN la base, independiente del tráfico web; cero código de
-- app/worker). No hace falta un estado `closed` intermedio para los expirados: la
-- lista ya los oculta por el read-filter, así que "expirado" se comporta como
-- "cerrado" para el usuario y el job los elimina físicamente. El estado `closed`
-- en DB queda sólo para el cierre manual del creador (que este mismo job borra).

-- 1) Extensión pg_cron. Idempotente; en Supabase crea el schema `cron`.
create extension if not exists pg_cron;

-- 2) Job horario. cron.schedule con NOMBRE hace UPSERT por jobname, así que
--    re-aplicar la migración actualiza el job en vez de duplicarlo.
--    El job corre como `postgres` (superuser) → bypassea RLS, no necesita policy
--    de DELETE. Borra en UNA sola sentencia todo lo que ya no sirve: cerrados por
--    el creador + expirados (pasó el horario + gracia de 30 min).
select cron.schedule(
  'shifts_cleanup',
  '0 * * * *',
  $job$
    delete from public.shifts
    where status = 'closed'
       or start_time < now() - interval '30 minutes';
  $job$
);
