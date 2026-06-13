# Matchpoint App — Spec v1

## Alcance
Este documento cubre exclusivamente la **versión 1 (MVP)**. Todo lo que no esté listado aquí está fuera de scope, aunque el modelo de datos se diseña para soportar versiones futuras sin migraciones costosas.

---

## Modelo de datos

### Organizer
```
id                    uuid      PK
email                 string    único
full_name             string
establishment_name    string
created_at            timestamp
```
> La contraseña es manejada por Supabase Auth. No se almacena en la tabla.

### Court
```
id              uuid      PK
organizer_id    uuid      FK → Organizer
name            string    ej. "Cancha 1"
type            enum      'outdoor' | 'indoor'
created_at      timestamp
```
> El modelo incluye los campos mínimos. La disponibilidad/horarios (v5) se agrega en esa versión sin romper esta estructura.

### Tournament
```
id                    uuid      PK
organizer_id          uuid      FK → Organizer
name                  string
status                enum      'draft' | 'published' | 'registration_open' |
                                'registration_closed' | 'in_progress' | 'finished'
category_type         enum      'individual' | 'suma'
category_value        string    '1ra'…'8va' si individual | número si suma (ej. '14')
gender                enum      'male' | 'female' | 'mixed'
tournament_date       date
registration_opens_at timestamp nullable — null indica apertura manual
max_pair_requests     int       cupos de lista de espera (en parejas)
max_pairs             int       cupos confirmados del torneo (en parejas)
created_at            timestamp
```

### Player
```
id              uuid      PK
full_name       string
email           string    nullable
phone           string    nullable
dni             string    nullable — identificador único para vincular perfil futuro (v4)
created_at      timestamp
```
> Al menos email o phone debe estar presente. DNI es opcional pero recomendado.
> Un mismo Player puede participar en múltiples torneos a través de distintas Pairs.

### Pair
```
id              uuid      PK
tournament_id   uuid      FK → Tournament
player1_id      uuid      FK → Player
player2_id      uuid      FK → Player
lookup_token    string    único — permite consultar estado sin login
status          enum      'pending' | 'accepted' | 'rejected'
created_at      timestamp
updated_at      timestamp
```
> La unidad de inscripción es la pareja. Un jugador llena el formulario con los datos de ambos.
> El lookup_token es compartido por los dos integrantes de la pareja.

### Zone
```
id              uuid      PK
tournament_id   uuid      FK → Tournament
name            string    ej. "Zona A"
is_published    boolean   default false
created_at      timestamp
```

### ZonePair
```
id              uuid      PK
zone_id         uuid      FK → Zone
pair_id         uuid      FK → Pair
position        int       nullable — se completa en v2 al cerrar la fase de grupos
points          int       default 0 — se acumula en v2
```

### Match
```
id              uuid      PK
zone_id         uuid      nullable FK → Zone
court_id        uuid      nullable FK → Court
round           int
team1_pair_id   uuid      FK → Pair
team2_pair_id   uuid      FK → Pair
team1_score     int       nullable — se usa en v2
team2_score     int       nullable — se usa en v2
status          enum      'pending' | 'in_progress' | 'finished'
created_at      timestamp
```
> Los partidos se generan en v1 al crear zonas (round-robin entre todas las parejas de la zona).
> Los scores y el estado se actualizan en v2.
> zone_id nullable reserva el campo para partidos de bracket en v2.

---

## Reglas de negocio

### Torneos
- Las transiciones de estado son unidireccionales: no se puede retroceder en el ciclo de vida
- Solo el Organizer dueño del torneo puede modificarlo
- Si `registration_opens_at` tiene valor, la inscripción se abre automáticamente en esa fecha/hora
- Si `registration_opens_at` es null, el organizador abre la inscripción manualmente
- No se pueden aceptar más parejas que `max_pairs`
- No se pueden recibir más solicitudes que `max_pair_requests`
- Un torneo solo puede eliminarse en estado `draft`

### Inscripciones
- La unidad de inscripción es la pareja — un jugador completa los datos de ambos integrantes
- Una pareja solo puede tener una inscripción activa por torneo
- El organizador solo puede aceptar o rechazar solicitudes enviadas por los jugadores
- El organizador puede aceptar / rechazar / remover parejas mientras el torneo **no** haya
  arrancado. Una vez `in_progress` (En curso) o `finished` (Finalizado) las inscripciones
  quedan **congeladas**: ya están sorteadas en zonas y no se pueden modificar (validado en
  la server action y reflejado en la UI, que oculta las acciones)
- Al registrarse, el sistema genera un `lookup_token` único asignado a la pareja

### Zonas
- Solo se pueden generar/modificar zonas cuando el torneo está en `registration_closed` o `in_progress`
- Las zonas se generan distribuyendo aleatoriamente las parejas aceptadas
- El organizador puede reasignar parejas entre zonas antes de publicar
- Al generar zonas, el sistema crea automáticamente los partidos en formato round-robin (todas las parejas de la zona juegan entre sí)
- Los partidos generados pueden modificarse manualmente por el organizador antes de publicar las zonas
- Una vez publicadas, las zonas son visibles públicamente y no pueden modificarse
- La asignación de cancha a cada partido es opcional y puede editarse en cualquier momento
- **v1: el único formato de partidos es round-robin (todos contra todos).**

> **Formatos de partido — diferido a v2.** Pedido de organizadores: a veces una zona no se
> juega todos-contra-todos (6 partidos para 4 parejas) sino en menos partidos (ej. 4, dos por
> equipo), con un esquema tipo "ganador vs perdedor". Darle al organizador la **elección del
> formato** al generar los partidos de cada zona:
>   1. **Round-robin** (todos contra todos) — el actual.
>   2. **Ganador vs perdedor** (americano/progresivo, ej. 4 partidos / 2 por equipo): la segunda
>      ronda empareja ganadores con ganadores y perdedores con perdedores.
>   3. **Manual** — el organizador arma los partidos a mano (agregar / quitar / editar).
>
> Se difiere a v2 **porque el modo "ganador vs perdedor" depende de los resultados** (saber quién
> ganó la primera ronda para armar la segunda), y el scoring de partidos recién llega en v2. Se
> implementa junto con resultados/standings.

---

## Páginas y rutas

### Área del Organizer (autenticada)

| Ruta | Descripción |
|---|---|
| `/login` | Login del organizer |
| `/register` | Registro del organizer |
| `/dashboard` | Vista general de torneos del organizer |
| `/courts` | Gestión de canchas del establecimiento |
| `/tournaments/new` | Crear nuevo torneo |
| `/tournaments/[id]` | Detalle y gestión del torneo |
| `/tournaments/[id]/registrations` | Gestión de inscripciones de parejas |
| `/tournaments/[id]/zones` | Gestión de zonas, partidos y asignación de canchas |

### Área pública (sin login)

| Ruta | Descripción |
|---|---|
| `/t/[tournamentId]` | Página pública del torneo: info + formulario de inscripción de pareja |
| `/t/[tournamentId]/zones` | Vista pública de zonas y partidos (visible cuando publicadas) |
| `/inscription/[token]` | Consulta de estado de inscripción por lookup token |

---

## Acceso a datos (implementación v1)

> **Nota de arquitectura.** El diseño REST (`/api/*`) que listaba originalmente esta sección se
> reemplazó por **Server Actions** (área autenticada) + **Vistas seguras y RPCs** (superficie
> pública). Se documenta el mecanismo real. Ver detalle de convenciones en `CLAUDE.md`.
> Auth la maneja Supabase Auth (sin rutas propias).

### Área del organizer — Server Actions (`requireUser()` + RLS + `revalidatePath`)
| Operación | Implementación |
|---|---|
| Crear / editar / avanzar estado / eliminar torneo | `src/app/tournaments/actions.ts` |
| CRUD de canchas | `src/app/courts/actions.ts` |
| Aceptar / rechazar / remover inscripción | `src/app/tournaments/[id]/registrations/actions.ts` (remove vía RPC `remove_pair`) |
| Generar / editar / publicar zonas y partidos, asignar cancha | `src/app/tournaments/[id]/zones/actions.ts` (generar/reasignar vía RPCs `generate_zones`/`move_pair_to_zone`; publicar/asignar cancha por update con RLS) |

### Superficie pública — Vistas seguras + RPCs (server-side con admin client)
| Operación | Implementación |
|---|---|
| Info pública del torneo (+ conteos de parejas) | vista `public_tournament_view` (anon) — `src/lib/public/tournament.ts` |
| Inscripción de pareja | RPC `register_pair` (SECURITY DEFINER, atómica, valida estado+cupo) vía admin client — `src/app/t/[tournamentId]/actions.ts` |
| Consulta de estado por token | lookup en `pairs` por `lookup_token` vía admin client — `src/lib/public/inscription.ts` |
| Zonas y partidos públicos | vistas `public_pair_view` / `public_court_view` + `zones`/`zone_pairs`/`matches` con RLS pública por `is_published` — `src/lib/public/zones.ts` |

> **Pendiente — apertura automática de inscripción** (`registration_opens_at`): requiere un job
> programado (Supabase scheduled function / cron). Documentado como TODO; hoy la apertura es manual.

---

## Componentes UI clave

### Organizer
- `TournamentCard` — tarjeta de torneo en el dashboard con estado y acciones rápidas
- `TournamentForm` — formulario de creación/edición con selector de categoría estructurado
- `CategorySelector` — selector de tipo (individual/suma) + valor + género
- `RegistrationTable` — tabla de inscripciones de parejas con acciones accept/reject/remove
- `ZoneBoard` — vista de zonas con drag-and-drop para reasignar parejas entre zonas
- `MatchList` — lista de partidos de una zona con selector de cancha y edición manual
- `TournamentStatusBadge` — badge visual del estado del torneo
- `CourtForm` — formulario para crear/editar cancha

### Público
- `PairRegistrationForm` — formulario de inscripción con datos de los dos jugadores de la pareja
- `InscriptionStatusCard` — card de estado de inscripción consultada por token (muestra ambos jugadores)
- `PublicZoneView` — visualización de zonas y partidos para jugadores

---

## Criterios de aceptación por feature

### Autenticación de Organizer ✅
- [x] El organizer puede registrarse con email, contraseña y nombre del establecimiento
- [x] El organizer puede iniciar y cerrar sesión
- [x] Las rutas del área de organizer redirigen a `/login` si no hay sesión activa

### Gestión de canchas ✅
- [x] El organizer puede crear canchas con nombre y tipo (al aire libre / techada)
- [x] El organizer puede editar y eliminar canchas
- [x] Las canchas eliminadas no afectan partidos ya asignados

### Creación de torneo ✅
- [x] El torneo se crea en estado `draft`
- [x] El selector de categoría diferencia entre individual (1ra–8va) y suma (número libre)
- [x] El género es campo requerido
- [x] Los cupos de solicitud deben ser mayores o iguales a los cupos de torneo (ambos en parejas)
- [x] Se puede configurar apertura automática de inscripción con fecha/hora o dejarla en manual

### Ciclo de vida del torneo
- [x] El organizer puede avanzar el estado del torneo manualmente en cada transición permitida
- [ ] La apertura automática de inscripción se ejecuta en la fecha/hora configurada *(pendiente: requiere job programado)*
- [x] No es posible retroceder un estado

### Gestión de inscripciones ✅
- [x] Los jugadores pueden enviar solicitud de pareja desde la página pública del torneo
- [x] El formulario requiere nombre + (email o teléfono) para cada integrante; DNI es opcional
- [x] Al enviar, el sistema genera un `lookup_token` único para la pareja y lo muestra
- [x] No se aceptan solicitudes cuando se alcanzó `max_pair_requests`
- [x] El organizer puede aceptar o rechazar cada solicitud de pareja
- [x] No se pueden aceptar más parejas que `max_pairs`
- [x] El organizer puede remover parejas aceptadas en cualquier momento

### Consulta de estado (sin login) ✅
- [x] La pareja puede consultar su estado en `/inscription/[token]`
- [x] La página muestra: nombre del torneo, nombres de ambos jugadores, estado actual

### Generación de zonas ✅
- [x] El sistema distribuye aleatoriamente las parejas aceptadas en zonas equilibradas
- [x] El organizer puede reasignar parejas entre zonas antes de publicar
- [x] Al generar zonas, el sistema crea partidos en formato round-robin (todas las parejas de la zona juegan entre sí)
- [x] El organizer puede modificar los partidos generados (reasignación de parejas regenera los partidos de las zonas afectadas) antes de publicar
- [x] Las zonas permanecen ocultas hasta que el organizer las publica
- [x] Una vez publicadas, no se pueden modificar (la regeneración/reasignación quedan bloqueadas)

### Asignación de canchas a partidos ✅
- [x] El organizer puede asignar una cancha de su establecimiento a cada partido
- [x] La asignación es opcional por partido
- [x] La cancha asignada puede cambiarse en cualquier momento (incluso con las zonas publicadas)

### Vista pública de zonas ✅
- [x] Una vez publicadas, cualquier persona puede ver las zonas en `/t/[id]/zones`
- [x] Se muestran las parejas de cada zona y los partidos generados con cancha asignada (si tiene)
- [x] Si las zonas no están publicadas, la ruta devuelve un mensaje de no disponible

---

## Mejoras de UI/UX (refinamientos completados)
- [x] **Date picker visual**: calendario interactivo con popover para fechas (tournament_date y registration_opens_at)
- [x] **Loading states**: spinners en navegación (dashboard, detalle de torneo, página pública) para feedback inmediato
- [x] **Share registration link**: panel visible en detalle del torneo con URL copiable, botón "Abrir página pública", y mensaje contextual (apertura automática si está configurada, o manual)
- [x] **Labels del ciclo de vida**: "Publicar", "Abrir inscripción", "Cerrar inscripción", "Iniciar torneo", "Finalizar torneo" (acciones claras, no destinos)
- [x] **Rebranding**: paleta azul profesional (#3B82F6) sobre azul noche, reemplazando verde neón. Token-based para cambios parejos
- [x] **Script de data fake**: `npm run seed:registrations` carga parejas falsas en un torneo para testing

---

## Fuera de scope en v1
- Login de jugadores
- Notificaciones (email / WhatsApp)
- Resultados y scoring de partidos (v2)
- Bracket / fase de llaves (v2)
- Posiciones y standings de zona (v2)
- Supabase Realtime (v2)
- Streaming (v3)
- Rankings y stats (v4)
- Gestión de turnos de canchas (v5)
