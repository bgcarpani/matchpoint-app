-- MatchUp App — v1 (MVP) initial schema
-- Ref: spec.md "Modelo de datos"
--
-- Convenciones:
--   * Toda PK es uuid generada con gen_random_uuid() (extensión pgcrypto, ya activa en Supabase).
--   * Timestamps con timezone (timestamptz).
--   * El modelo se diseña para soportar versiones futuras sin migraciones costosas
--     (ver campos nullable reservados: position/points, zone_id en match, scores).

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type court_type as enum ('outdoor', 'indoor');

create type tournament_status as enum (
  'draft',
  'published',
  'registration_open',
  'registration_closed',
  'in_progress',
  'finished'
);

create type category_type as enum ('individual', 'suma');

create type gender as enum ('male', 'female', 'mixed');

create type pair_status as enum ('pending', 'accepted', 'rejected');

create type match_status as enum ('pending', 'in_progress', 'finished');

-- ---------------------------------------------------------------------------
-- Organizer
-- Dueño de establecimiento. Su id coincide con el usuario de Supabase Auth.
-- ---------------------------------------------------------------------------
create table organizers (
  id                  uuid primary key references auth.users (id) on delete cascade,
  email               text not null unique,
  full_name           text not null,
  establishment_name  text not null,
  created_at          timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Court — cancha física del organizador
-- ---------------------------------------------------------------------------
create table courts (
  id            uuid primary key default gen_random_uuid(),
  organizer_id  uuid not null references organizers (id) on delete cascade,
  name          text not null,
  type          court_type not null,
  created_at    timestamptz not null default now()
);

create index courts_organizer_id_idx on courts (organizer_id);

-- ---------------------------------------------------------------------------
-- Tournament
-- ---------------------------------------------------------------------------
create table tournaments (
  id                     uuid primary key default gen_random_uuid(),
  organizer_id           uuid not null references organizers (id) on delete cascade,
  name                   text not null,
  status                 tournament_status not null default 'draft',
  category_type          category_type not null,
  -- '1ra'..'8va' si individual | número (como texto, ej. '14') si suma
  category_value         text not null,
  gender                 gender not null,
  tournament_date        date not null,
  -- null indica apertura manual de la inscripción
  registration_opens_at  timestamptz,
  -- cupos de lista de espera (en parejas)
  max_pair_requests      integer not null,
  -- cupos confirmados del torneo (en parejas)
  max_pairs              integer not null,
  created_at             timestamptz not null default now(),

  constraint tournaments_max_pairs_positive check (max_pairs > 0),
  constraint tournaments_max_requests_positive check (max_pair_requests > 0),
  -- Acceptance criteria: cupos de solicitud >= cupos de torneo
  constraint tournaments_requests_gte_pairs check (max_pair_requests >= max_pairs)
);

create index tournaments_organizer_id_idx on tournaments (organizer_id);
create index tournaments_status_idx on tournaments (status);

-- ---------------------------------------------------------------------------
-- Player — sin login en v1. DNI es el nexo para el perfil de jugador (v4).
-- ---------------------------------------------------------------------------
create table players (
  id          uuid primary key default gen_random_uuid(),
  full_name   text not null,
  email       text,
  phone       text,
  dni         text,
  created_at  timestamptz not null default now(),

  -- Al menos email o phone debe estar presente
  constraint players_contact_present check (email is not null or phone is not null)
);

-- ---------------------------------------------------------------------------
-- Pair — unidad de inscripción (dos jugadores fijos)
-- ---------------------------------------------------------------------------
create table pairs (
  id             uuid primary key default gen_random_uuid(),
  tournament_id  uuid not null references tournaments (id) on delete cascade,
  player1_id     uuid not null references players (id),
  player2_id     uuid not null references players (id),
  -- compartido por ambos integrantes; permite consultar estado sin login
  lookup_token   text not null unique,
  status         pair_status not null default 'pending',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),

  constraint pairs_distinct_players check (player1_id <> player2_id)
);

create index pairs_tournament_id_idx on pairs (tournament_id);
create index pairs_status_idx on pairs (status);

-- ---------------------------------------------------------------------------
-- Zone
-- ---------------------------------------------------------------------------
create table zones (
  id             uuid primary key default gen_random_uuid(),
  tournament_id  uuid not null references tournaments (id) on delete cascade,
  name           text not null,
  is_published   boolean not null default false,
  created_at     timestamptz not null default now()
);

create index zones_tournament_id_idx on zones (tournament_id);

-- ---------------------------------------------------------------------------
-- ZonePair — pareja asignada a una zona
-- position/points quedan reservados para standings de zona (v2)
-- ---------------------------------------------------------------------------
create table zone_pairs (
  id        uuid primary key default gen_random_uuid(),
  zone_id   uuid not null references zones (id) on delete cascade,
  pair_id   uuid not null references pairs (id) on delete cascade,
  position  integer,
  points     integer not null default 0,

  -- una pareja no puede repetirse dentro de la misma zona
  constraint zone_pairs_unique_pair_per_zone unique (zone_id, pair_id)
);

create index zone_pairs_zone_id_idx on zone_pairs (zone_id);
create index zone_pairs_pair_id_idx on zone_pairs (pair_id);

-- ---------------------------------------------------------------------------
-- Match — generado round-robin al crear zonas. Scores/estado se usan en v2.
-- zone_id nullable reserva el campo para partidos de bracket en v2.
-- ---------------------------------------------------------------------------
create table matches (
  id             uuid primary key default gen_random_uuid(),
  zone_id        uuid references zones (id) on delete cascade,
  court_id       uuid references courts (id) on delete set null,
  round          integer not null,
  team1_pair_id  uuid not null references pairs (id) on delete cascade,
  team2_pair_id  uuid not null references pairs (id) on delete cascade,
  team1_score    integer,
  team2_score    integer,
  status         match_status not null default 'pending',
  created_at     timestamptz not null default now(),

  constraint matches_distinct_teams check (team1_pair_id <> team2_pair_id)
);

create index matches_zone_id_idx on matches (zone_id);
create index matches_court_id_idx on matches (court_id);

-- ---------------------------------------------------------------------------
-- updated_at trigger para pairs
-- ---------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger pairs_set_updated_at
  before update on pairs
  for each row
  execute function set_updated_at();
