-- ===========================================================================
-- 0019 — Branding del organizador (v3 parte 2). Ver spec-v3-2.md, Feature A.
--
-- Suma identidad propia al organizador: logo (Supabase Storage), dirección /
-- ubicación y paleta de marca (theme_key). Todo es PÚBLICO (se muestra a los
-- jugadores en las páginas públicas), así que se expone vía public_organizer_view.
--
-- Aplicar: npm run db:apply -- 0019
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- Columnas de branding en organizers
-- ---------------------------------------------------------------------------
alter table organizers
  add column if not exists logo_path text,                          -- path en bucket org-logos ({uid}/logo.<ext>); null = sin logo
  add column if not exists address   text,                          -- dirección legible (texto libre)
  add column if not exists maps_url   text,                         -- link opcional a Google/Apple Maps
  add column if not exists theme_key  text not null default 'royal'; -- clave de paleta curada (fuente de verdad: branding/themes.ts)

-- Validación blanda de la key (la fuente de verdad es el map en TS; esto es defensa).
alter table organizers
  drop constraint if exists organizers_theme_key_check;
alter table organizers
  add constraint organizers_theme_key_check
  check (theme_key in ('royal', 'pista', 'clay', 'match', 'aqua', 'grafito'));

-- ---------------------------------------------------------------------------
-- public_organizer_view (delta sobre 0009) — ahora expone el branding público.
-- Sin PII: id, establishment_name, calendar_slug + logo_path, address, maps_url,
-- theme_key. Resuelve cualquier organizer por id/slug (igual que 0009).
-- ---------------------------------------------------------------------------
drop view if exists public_organizer_view;
create view public_organizer_view as
  select o.id,
         o.establishment_name,
         o.calendar_slug,
         o.logo_path,
         o.address,
         o.maps_url,
         o.theme_key
  from organizers o;

grant select on public_organizer_view to anon, authenticated;

-- ===========================================================================
-- Supabase Storage — bucket de logos (PRIMER uso de Storage del proyecto).
-- Bucket público (los logos se muestran en páginas públicas e imágenes OG).
-- Convención de path: {organizer_id}/logo.<ext> — un logo por organizador.
-- ===========================================================================
insert into storage.buckets (id, name, public)
values ('org-logos', 'org-logos', true)
on conflict (id) do nothing;

-- Lectura pública del bucket.
drop policy if exists "org_logos_public_read" on storage.objects;
create policy "org_logos_public_read" on storage.objects
  for select
  using (bucket_id = 'org-logos');

-- Insert/Update/Delete sólo del propio organizador: el primer segmento del path
-- debe ser su uid (carpeta namespaceada por organizador).
drop policy if exists "org_logos_owner_write" on storage.objects;
create policy "org_logos_owner_write" on storage.objects
  for all
  to authenticated
  using (
    bucket_id = 'org-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'org-logos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
