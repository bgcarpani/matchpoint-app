# Spec — Aprobación de cuentas de organizador (gate de registro)

> **FASE 1 IMPLEMENTADA Y VERIFICADA E2E (2026-07-01).** Migración `0023` **aplicada a la
> base real** (backfill OK: todas las cuentas existentes quedaron `approved`). Flujo probado
> vía dev server: registro → cuenta nace `pending` → login aterriza en `/pending` →
> `/dashboard` rebota a `/pending` → aprobar por SQL → dashboard entra normal → un aprobado
> que visita `/pending` rebota a `/dashboard` → logout desde `/pending` OK. `tsc` + `eslint`
> limpios. **Pendiente: commit + deploy.** ⚠️ Hasta deployar, el gate RLS ya está vivo en la
> base pero el código en prod es el viejo: un registro nuevo en prod queda `pending`, entra
> al dashboard viejo (sin `/pending`) y las escrituras le fallan por RLS con error crudo.
>
> Deltas de implementación vs. el plan de abajo: (a) el helper se llama
> `requireApprovedOrganizer()` y vive en `src/lib/supabase/auth.ts` junto a `requireUser()`;
> como no hay layout compartido del área organizer, se usa en las **9 páginas** del área
> (dashboard, courts, settings, tournaments new/detail/edit/zones/bracket/registrations),
> reemplazando el chequeo inline de `getUser()`. (b) `/pending` vive en el route group
> `(auth)` (`src/app/(auth)/pending/page.tsx`) para heredar la tarjeta centrada; reusa la
> action `signOut` existente. (c) El middleware NO necesitó cambios: `/pending` no está en
> `PROTECTED_PREFIXES` ni en `AUTH_ROUTES`, así que pasa sin rebote. (d) Se agregó
> `OrganizerStatus` + columnas `status`/`reviewed_at` a los tipos de `database.ts`.
>
> Objetivo: que la creación de cuentas de organizador requiera **aprobación manual del
> dueño de la plataforma** (Bruno), para que no entren "usuarios random". Hoy el registro
> es autoservicio abierto.

## Decisiones ya tomadas (no re-discutir)
- **Alcance: SOLO el registro de organizador.** Turnos (`/turnos`, sin login, token) y las
  páginas públicas de torneo (`/t/[id]`, inscripción, zonas, llaves) **quedan como están**.
  El spam de turnos NO se aborda acá (decisión consciente; queda como tema aparte).
- **Mecanismo: solicitud → pendiente → aprobación.** La gente igual se registra (puerta de
  entrada / lead gen), pero la cuenta queda inerte hasta que el dueño la aprueba.
- **Arrancar por la Opción A (manual):** aprobar con un `UPDATE` desde el dashboard de
  Supabase. El `/admin` con botones y los emails de notificación quedan para una segunda
  pasada (construir cuando el volumen lo justifique).

## Estado actual del código (referencia)
- Registro: [`registerOrganizer`](src/app/(auth)/actions.ts:32) hace `supabase.auth.signUp`
  con metadata `{ full_name, establishment_name }`. La fila en `organizers` la crea el trigger
  [`handle_new_user`](supabase/migrations/0003_auth_trigger.sql) (SECURITY DEFINER).
- UI de registro: [`register-form.tsx`](src/app/(auth)/register/register-form.tsx) — muestra
  "Revisá tu email" al terminar (estado `sent`).
- Middleware: [`proxy.ts`](src/lib/supabase/proxy.ts) — control **optimista**; `PROTECTED_PREFIXES
  = ['/dashboard','/courts','/tournaments']`. La autorización real es por RLS.
- RLS: [`0002_rls_policies.sql`](supabase/migrations/0002_rls_policies.sql) — policies de
  escritura del dueño: `courts_all_own` (l.58) y `tournaments_all_own` (l.65). Todo lo demás
  (players/pairs/zones/zone_pairs/matches) cuelga del helper `owns_tournament(uuid)`, así que
  gateando la creación de `tournaments` y `courts` alcanza para dejar la cuenta inerte.
- Regla del proyecto: "middleware optimista + **RLS como frontera real**"; cada página del área
  organizer revalida con `getUser()`.

## Implementación — Fase 1 (lo mínimo que da control real)

### 1. Migración `supabase/migrations/0023_organizer_approval.sql`
> `db:apply` NO es idempotente. Correr con `npm run db:apply -- 0023`.
> (`0022_shifts_cleanup.sql` ya está tomado por la limpieza de turnos.)
- `alter table organizers add column status text not null default 'pending'
  check (status in ('pending','approved','rejected'));`
  (opcional: `reviewed_at timestamptz`, `reviewed_by uuid`).
- **BACKFILL CRÍTICO** (si falta, la cuenta del dueño queda bloqueada):
  `update organizers set status = 'approved';` (todos los existentes ya aprobados).
- Helper: `is_approved_organizer()` `SECURITY DEFINER`, `stable`, `set search_path = public`:
  `select exists(select 1 from organizers where id = auth.uid() and status = 'approved');`
- Gatear **solo el WITH CHECK** de las policies de escritura (las lecturas quedan owner-only):
  recrear `courts_all_own` y `tournaments_all_own` para que el `with check` sume
  `and is_approved_organizer()`. (Un pendiente puede loguear y ver dashboard vacío, pero toda
  escritura la rechaza la base — incluso si burla la UI.)
  - ⚠️ En `tournaments` NO tocar `tournaments_public_read` (lectura pública de no-draft).

### 2. Gate en la app (UX)
- Nueva ruta `src/app/pending/page.tsx` (fuera del área protegida): pantalla "Tu cuenta está
  en revisión / te avisamos cuando la aprobemos". Con botón de logout.
- Helper `requireApprovedOrganizer()` (o extender el `requireUser()` existente): tras `getUser()`,
  consulta `organizers.status`; si `!== 'approved'` → `redirect('/pending')`. Usarlo en el layout
  del área organizer (o en dashboard/courts/tournaments). Ver dónde vive hoy `requireUser`.
- Agregar `/pending` a las rutas que el middleware deja pasar autenticado sin rebote (revisar
  `AUTH_ROUTES` / lógica de `proxy.ts` para que un logueado-pendiente no quede en loop).

### 3. Registro (mensaje)
- [`register-form.tsx`](src/app/(auth)/register/register-form.tsx): cambiar el bloque `sent`
  de "Revisá tu email" → "Tu solicitud quedó registrada. Confirmá tu email y te avisamos
  cuando aprobemos la cuenta." (`registerOrganizer` no necesita cambios de lógica.)
- Confirmación de email se mantiene (valida que el mail exista); la aprobación es el gate real.

### Cómo aprueba el dueño (Fase 1 = manual)
```sql
-- ver pendientes
select email, full_name, establishment_name, created_at
from organizers where status = 'pending';
-- aprobar / rechazar
update organizers set status = 'approved' where email = 'xxx@yyy';
```

## Fase 2 — página `/admin`: IMPLEMENTADA (2026-07-01, mismo día que Fase 1)
> El dueño necesitaba aprobar desde la app; se adelantó la versión mínima del `/admin`
> (sin los emails). Verificada e2e vía dev server: cuenta pendiente aparece listada →
> botón Aprobar la pasa a `approved` en la base → esa cuenta entra al dashboard; un
> organizador aprobado que NO es admin recibe **404** en `/admin`.
- **`src/app/admin/page.tsx`**: lista las solicitudes `pending` (con **admin client** — la RLS
  de `organizers` es owner-only) + botones Aprobar/Rechazar por fila (forms con server action
  `reviewOrganizer` bindeada). Sin link en la nav: se entra por URL directa.
- **`src/app/admin/actions.ts`** → `reviewOrganizer(id, decision)`: `requireUser()` +
  `isPlatformAdmin()` y update con admin client (`status` + `reviewed_at`), `revalidatePath('/admin')`.
- **`src/lib/admin.ts`** → `isPlatformAdmin(userId)`: chequea contra env `ADMIN_USER_IDS`
  (ids coma-separados, server-only). Config: `.env.local` en dev, **`vars` de `wrangler.jsonc`**
  en prod (no es secreto: sin la sesión del dueño el id no sirve). Id del dueño:
  `c0574a8b-0a53-4b35-a480-36b8253ef9fd`.
- `/admin` agregado a `PROTECTED_PREFIXES` del middleware; la página además devuelve `notFound()`
  a cualquier logueado no-admin (no revela que la ruta existe).

## Fase 2 restante (diferida — construir cuando el volumen lo pida)
- **Email de aviso al dueño** cuando entra una solicitud (Resend, ya hay infra + `EMAIL_FROM`).
- **Email al organizador** cuando se aprueba ("ya podés entrar", con link).
- (Opcional) mover el estado a `app_metadata` del usuario para que el middleware lo lea del JWT
  sin query por request. Si no, el gate vive en RLS + layout (suficiente).

## Roadmap a futuro (cómo escalar el gate)
1. **Hoy:** aprobación manual (esta spec). OK hasta decenas de establecimientos.
2. **Semi-automático:** señales de verificación (WhatsApp/teléfono, dirección + Maps que ya
   existen en branding/`/settings`); el dueño solo revisa dudosos.
3. **Invitaciones en cadena:** un organizador aprobado invita a otros con cupo.
4. **Roles/tiers en v4 (login de jugador):** `organizer` (vetado, este gate) vs `player`
   (autoservicio abierto, otra tabla). Encaja con la nota del trigger `handle_new_user`
   ("en v4 diferenciar el tipo de usuario").

## Gotchas
- **Backfill a `approved`** (Fase 1.1) — único paso que puede romper prod. No olvidar.
- `mailer_autoconfirm=true` sigue TEMPORAL en prod; con este gate importa menos, pero volver a
  `false` al verificar el dominio de Resend (ya anotado en CLAUDE.md).
- Deploy usa el working tree en disco (no git) y pisa la única prod — ver runbook en CLAUDE.md.
- Verificar `tsc` + `eslint` limpios y flujo real (registro → pending → aprobar por SQL →
  dashboard) antes de dar por cerrado.
