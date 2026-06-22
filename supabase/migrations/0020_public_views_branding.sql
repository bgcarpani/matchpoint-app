-- ===========================================================================
-- 0020 — Branding del organizador en la vista pública del torneo (v3 parte 2).
--
-- public_tournament_view ya joinea organizers (para establishment_name). Le
-- agregamos el branding (theme_key, logo_path, address, maps_url) para que las
-- páginas públicas /t/[id] (y zonas/llaves) puedan teñirse con la paleta del
-- club y mostrar su logo y dirección. Sin PII (todo es público).
--
-- El calendario público (/o/[slug]) ya lee public_organizer_view, que desde 0019
-- expone estas columnas: no necesita cambio de vista.
--
-- Aplicar: npm run db:apply -- 0020
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
    ) as zones_published,
    -- Branding (columnas nuevas al FINAL: create-or-replace no permite
    -- reordenar/renombrar las existentes).
    o.theme_key,
    o.logo_path,
    o.address,
    o.maps_url
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
