-- Matchpoint App — v2 (Feature 1) Calendario público del organizador
-- Ref: spec-v2.md "Feature 1 — Calendario público (link estático + QR)"
--
-- Delta sobre v1:
--   * organizers.calendar_slug: token corto, no adivinable, NO derivado del
--     nombre ni del UUID, generado una vez al crear el organizer e inmutable
--     (el QR impreso no se debe romper). Backfill a organizers existentes.
--   * public_organizer_view: se redefine para exponer calendar_slug y resolver
--     el encabezado del calendario por slug AUNQUE el organizer no tenga
--     torneos activos (antes filtraba a "tiene torneo no-borrador" → habría
--     dado 0 filas y un 404 indebido). Sólo columnas no sensibles
--     (establishment_name es info de negocio pública; sin email/PII).
--   * public_calendar_tournament_view: torneos en estados "activos/vigentes"
--     (sin draft/finished), columnas seguras, grant a anon.

-- ===========================================================================
-- Helper interno: genera un slug único de 8 chars en un alfabeto base32 sin
-- caracteres ambiguos (sin 0/o, 1/i/l). Reintenta ante colisión. No se otorga
-- a nadie: sólo lo usa el DEFAULT de la columna y el backfill de abajo.
-- (pgcrypto gen_random_bytes vive en `extensions` y no se ve con
--  search_path=public —ver CLAUDE.md GOTCHAS—; por eso usamos random().)
-- ===========================================================================
create or replace function _gen_calendar_slug()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  alphabet constant text := '23456789abcdefghjkmnpqrstuvwxyz';
  v_slug text;
  i int;
begin
  loop
    v_slug := '';
    for i in 1..8 loop
      v_slug := v_slug || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from organizers where calendar_slug = v_slug);
  end loop;
  return v_slug;
end;
$$;

revoke execute on function _gen_calendar_slug() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Columna + backfill + UNIQUE NOT NULL + DEFAULT.
-- El DEFAULT cubre los altas nuevas (incluida la fila que crea el trigger
-- handle_new_user de 0003, que no setea calendar_slug). La unicidad la
-- garantiza el constraint; la colisión es ~imposible (31^8) y, de darse en
-- inserts concurrentes, el UNIQUE la rechaza.
-- ---------------------------------------------------------------------------
alter table organizers add column if not exists calendar_slug text;

update organizers set calendar_slug = _gen_calendar_slug() where calendar_slug is null;

alter table organizers alter column calendar_slug set default _gen_calendar_slug();
alter table organizers alter column calendar_slug set not null;
alter table organizers add constraint organizers_calendar_slug_unique unique (calendar_slug);

-- ===========================================================================
-- public_organizer_view (delta) — ahora resuelve cualquier organizer por slug
-- (sin el filtro de "tiene torneo no-borrador"), para que un slug válido sin
-- torneos activos devuelva el encabezado en vez de 0 filas. Sin PII.
-- ===========================================================================
drop view if exists public_organizer_view;
create view public_organizer_view as
  select o.id, o.establishment_name, o.calendar_slug
  from organizers o;

grant select on public_organizer_view to anon, authenticated;

-- ===========================================================================
-- public_calendar_tournament_view (nueva) — torneos "vigentes" del calendario.
-- Activos = published | registration_open | registration_closed | in_progress.
-- Se excluyen draft y finished. Orden lo aplica el cliente (tournament_date).
-- Columnas seguras (sin PII). security_invoker off (default) → corre como owner
-- y bypassea RLS; el filtro de estados va en el WHERE.
-- ===========================================================================
create view public_calendar_tournament_view as
  select
    t.id,
    t.organizer_id,
    t.name,
    t.category_type,
    t.category_value,
    t.gender,
    t.tournament_date,
    t.status
  from tournaments t
  where t.status in (
    'published', 'registration_open', 'registration_closed', 'in_progress'
  );

grant select on public_calendar_tournament_view to anon, authenticated;
