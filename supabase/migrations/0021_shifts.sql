-- Tablero de turnos (`/turnos`): sección pública para jugadores (sin login) donde
-- publicar un turno de cancha reservado con lugares vacíos y encontrar compañeros.
-- Ver `spec-turnos.md`. Sin integración con torneos/canchas/organizadores; canchas
-- como texto libre; acceso de escritura por `manage_token`.

create table shifts (
  id            uuid        primary key default gen_random_uuid(),
  manage_token  uuid        not null default gen_random_uuid(),

  -- Turno
  court_name    text        not null,
  start_time    timestamptz not null,
  slots_needed  smallint    not null check (slots_needed between 1 and 4),
  category      text,                    -- texto libre, opcional
  notes         text,                    -- opcional

  -- Contacto del creador
  creator_name  text        not null,
  whatsapp      text        not null,    -- dígitos sin prefijo (se normaliza al guardar)
  instagram     text,                    -- handle sin @ , opcional

  -- Estado
  status        text        not null default 'open'
                check (status in ('open', 'full', 'closed')),

  created_at    timestamptz not null default now()
);

-- Índice para la query principal (lista ordenada por proximidad, excluyendo cerrados).
create index shifts_start_time_idx on shifts (start_time asc)
  where status <> 'closed';

-- RLS: lectura pública, escritura solo por Server Actions (admin client, que valida
-- `manage_token` en la query). No se expone política de escritura a anon/authenticated
-- para evitar bypass del token.
alter table shifts enable row level security;

create policy "shifts_public_read" on shifts
  for select using (true);
