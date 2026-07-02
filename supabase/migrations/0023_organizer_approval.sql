-- Matchpoint App — Aprobación de cuentas de organizador (gate de registro)
-- Ref: spec-account-approval.md — Fase 1
--
-- El registro sigue siendo autoservicio (lead gen), pero la cuenta nace
-- 'pending' y queda inerte hasta que el dueño de la plataforma la aprueba.
-- El gate real vive acá: las policies de escritura de courts/tournaments
-- exigen organizador aprobado. Todo lo demás (players/pairs/zones/zone_pairs/
-- matches) cuelga de owns_tournament(), así que gatear la creación de
-- tournaments y courts alcanza para dejar la cuenta inerte.

-- 1. Estado de aprobación en organizers ------------------------------------
alter table organizers
  add column status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  add column reviewed_at timestamptz;

-- BACKFILL: todos los organizadores existentes quedan aprobados.
-- (Sin esto, las cuentas actuales —incluida la del dueño— quedarían bloqueadas.)
update organizers set status = 'approved', reviewed_at = now();

-- 2. Helper: ¿el usuario autenticado es un organizador aprobado? ------------
create or replace function is_approved_organizer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from organizers o
    where o.id = auth.uid() and o.status = 'approved'
  );
$$;

-- 3. Gatear SOLO el WITH CHECK de las policies de escritura del dueño -------
-- Las lecturas (USING) quedan como estaban: un pendiente puede loguear y ver
-- su dashboard vacío, pero toda escritura la rechaza la base, incluso si
-- burla la UI. NO se toca tournaments_public_read (lectura pública de no-draft).

drop policy courts_all_own on courts;
create policy courts_all_own on courts
  for all
  using (organizer_id = auth.uid())
  with check (organizer_id = auth.uid() and is_approved_organizer());

drop policy tournaments_all_own on tournaments;
create policy tournaments_all_own on tournaments
  for all
  using (organizer_id = auth.uid())
  with check (organizer_id = auth.uid() and is_approved_organizer());
