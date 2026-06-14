# Matchpoint App

## Proyecto
Plataforma web para la comunidad de padel orientada a organizadores y jugadores.
Objetivo a largo plazo: perfiles de jugador con historial, stats y rankings.
Las primeras versiones son organizer-first.

**Versión actual en desarrollo:** v1 — MVP (auto gestión de torneos)

## Documentos de referencia
- `functional-doc.md` — análisis funcional completo (todas las versiones)
- `spec.md` — especificación detallada de implementación de v1
- `spec-v2.md` — especificación de implementación de v2 (en construcción)
- `spec-v3.md` — especificación de implementación de v3 (comunicaciones: email + share)

## Stack
- Next.js 16 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (PostgreSQL + Auth)
- Deploy: Cloudflare Pages

> Regla: cada tecnología/herramienta se instala solo cuando es necesaria, no antes.

> IMPORTANTE (Next 16): tiene breaking changes respecto a versiones previas. Antes de
> escribir código específico de Next, consultar la doc local en `node_modules/next/dist/docs/`.
> Ver `AGENTS.md` en la raíz.

## Comandos
```
npm run dev                 # desarrollo local
npm run build              # build de producción
npm run start              # servir build de producción
npm run lint               # linting
npm run db:apply           # aplica migraciones SQL pendientes vía Supabase Management API
npm run seed:registrations # carga data fake de solicitudes en un torneo (testing)
```
> `db:apply` corre `scripts/apply-migrations.mjs`. **No es idempotente**: aplica los `.sql` en orden y
> re-aplicar uno ya corrido falla por objetos existentes. Para una migración nueva: agregar
> `supabase/migrations/00NN_*.sql` y correr `npm run db:apply -- 00NN` (filtra por prefijo).
> 
> `seed:registrations` carga 15 parejas falsas en un torneo. Uso: `npm run seed:registrations -- <tournament-id> [num]`.
> Útil para testear flujos de inscripción/gestión sin llenar data manualmente.

## Estado de implementación (v1)
Slices completados (build + lint + e2e OK): **Fundación, Auth de Organizer, Canchas, Torneos**
(CRUD + ciclo de vida), **Inscripciones** (alta pública + accept/reject/remove + consulta por token),
**Zonas y partidos** (generación al azar + round-robin vía RPC, reasignación de parejas y cancha
opcional por partido editables antes de publicar, vista pública en `/t/[id]/zones`).
**v1 MVP funcionalmente completo.** Pendiente conocido: apertura automática de inscripción
(`registration_opens_at`) requiere un job programado (Supabase cron) — hoy la apertura es manual.

**v2 — slices 1 a 5 completados** (build + lint OK, commiteados): calendario público + QR,
anti-duplicado por email, resultados/scoring, standings de zona + formatos de partido, y fase de
llaves / bracket. **Feature 6 (Realtime / seguimiento en vivo) SUSPENDIDA** (2026-06-13): postergada
por decisión de producto; en su lugar se priorizan refinamientos de UI/UX. Hechos: filtrado público
de zonas funcional (`/t/[id]/zones`), rediseño del manager de zonas (tarjetas de partido compactas +
sección "Partidos" separada de parejas/posiciones). Pendiente: botón "compartir campeón".
Especificación en `spec-v2.md`; el detalle granular por slice vive en la memoria del asistente.

**v3 — comunicaciones (especificada, sin implementar).** Eje: email transaccional vía Resend.
Slices: (0) infra de email + helper de URL absoluta, (1) email de inscripción pendiente con link de
seguimiento, (2) emails de cambio de estado aceptado/rechazado, (3) auth por email del organizer
(confirmación real + reset de contraseña; reemplaza `mailer_autoconfirm`), (4) botón "Compartir en
WhatsApp" en torneo/calendario/campeón, (5) "Compartir en historia de Instagram" con imagen generada
(`next/og`). Decisiones: Resend (no Gmail SMTP); mails solo al jugador 1; WhatsApp **automático**
pospuesto (solo el botón de compartir entra); transmisiones/streaming diferido a la última versión.
Especificación completa en `spec-v3.md`.

## Convenciones de implementación (v1)
> No revertir sin discusión; reflejan decisiones ya validadas en código y verificadas e2e.

### Next 16
- El middleware se llama **`proxy`** (breaking change): `src/proxy.ts` + `src/lib/supabase/proxy.ts`;
  la función exportada es `proxy`, no `middleware`.
- `cookies()` es async; los `params` de página/route son `Promise` → siempre `await`.
- La protección de rutas del proxy es **optimista**: cada página del área organizer revalida con
  `supabase.auth.getUser()` y redirige a `/login` por su cuenta.

### Supabase — clientes y claves
- `src/lib/supabase/{client,server,admin}.ts`: navegador (publishable) / SSR con cookies (async) /
  service-role (server-only, **bypassea RLS**; nunca importar en Client Components).
- Claves nuevas: **`sb_publishable_…`** = anon key (va al navegador) y **`sb_secret_…`** = service_role
  (sólo server). En Project Settings → API Keys. Validar conexión con `/auth/v1/settings`.
- DEV: `mailer_autoconfirm = true` (seteado vía Management API). Revisar antes de producción (v3).

### Arquitectura de datos
- **Área organizer (autenticada): Server Actions**, no API routes REST. Patrón:
  `src/app/<ruta>/actions.ts` con `requireUser()` + RLS + `revalidatePath`; el cliente hace
  `router.refresh()`. (La sección "Acceso a datos" de spec.md documenta el mapeo real.)
- **Superficie pública**: NO se exponen tablas con PII a anon. Se usan **VISTAS de columnas seguras**
  (`public_tournament_view`, `public_pair_view`, `public_court_view`, `public_organizer_view`) +
  **RPCs SECURITY DEFINER** (`register_pair`, `remove_pair`) que validan las reglas dentro de la base.
  Las mutaciones públicas (inscripción, consulta por token) corren server-side con el admin client.
- RLS estricta en las 8 tablas; helper `owns_tournament(uuid)` (SECURITY DEFINER).

### GOTCHAS de Supabase (ya nos pegaron — tenerlos presentes)
- **Grants de funciones**: Supabase otorga EXECUTE a `anon`/`authenticated` por DEFAULT PRIVILEGES,
  así que `revoke … from public` NO alcanza. Para que una RPC sea server-only hay que
  `revoke execute on function … from anon, authenticated` **explícito** (verificar con la anon key
  que devuelva `permission denied`).
- **pgcrypto**: `gen_random_bytes()` vive en el schema `extensions`, no en `public`; con
  `search_path = public` no se ve. Para tokens usar `gen_random_uuid()` (sí resuelve).

### Validación y UI
- Stack: react-hook-form 7 + **zod 4** (`z.email()`, no `z.string().email()`) + @hookform/resolvers 5.
- React Compiler: `watch()`/`setValue()` de RHF disparan `react-hooks/incompatible-library`. Para
  toggles/selects/fechas usar **`useState` local**; reservar RHF para register/handleSubmit/formState.
  (Ver `DateField` y `DateTimeField` como patrón: estado local + merge al submit, igual que `CategorySelector`.)
- El `Button` de shadcn usa `@base-ui/react` → **no tiene `asChild`**. Para link-as-button usar
  `buttonVariants()` sobre `<Link>`.
- **Calendar date picker**: `react-day-picker` + Popover de `@base-ui/react`, captions en español (Intl,
  sin date-fns), tema oscuro, pasado deshabilitado. Ver `src/components/ui/calendar.tsx` y
  `src/components/form/date-field.tsx`.
- **Loading states**: `loading.tsx` en rutas pesadas (dashboard, `/t/[id]`, `/tournaments/[id]`) con
  spinner desde `src/components/ui/spinner.tsx`. Feedback inmediato en navegación.
- **Tema (branding)**: azul deportivo (`--volt: #3B82F6`) sobre azul noche profundo
  (`--background: #0B1220`) + halo radial azul (clase `.glow` en `<body>`, capa fija z-0 detrás del
  contenido — por eso cada página usa `relative z-[2]`). Tokens en `globals.css` (--background,
  --foreground, --accent, etc.). Cambio de paleta = actualizar variables CSS.

## Entidades clave (v1)
- **Organizer**: dueño de establecimiento, tiene login, crea y gestiona torneos
- **Court**: cancha física (al aire libre / techada), pertenece a un Organizer
- **Pair**: unidad de inscripción y participación; dos jugadores fijos que compiten juntos
- **Player**: integrante de una pareja; sin login en v1 por decisión de MVP

## Modelo de categorías de torneo
- Individual: selector 1ra → 8va
- Suma: número libre (ej. 14 = 8va + 6ta, suma de categorías de ambos jugadores)
- Género: Masculino / Femenino / Mixto (aplica a ambos tipos)

## Ciclo de vida del torneo
Borrador → Publicado → Inscripción abierta → Inscripción cerrada → En curso → Finalizado
(Transiciones unidireccionales, no se retrocede.)

## Formato de torneo
Americano + Llaves, con **parejas fijas** durante todo el torneo:
1. Fase de zonas: round-robin entre parejas de la zona (todas contra todas)
2. Fase de llaves (v2): eliminación directa según clasificación de zona

## Scope actual — v1
- Login de Organizer únicamente (no de Player)
- CRUD de torneos con ciclo de vida completo
- Gestión de canchas
- Inscripción de parejas (jugador carga datos de ambos) + accept/reject del organizer
- Generación de zonas al azar + partidos round-robin (editables manualmente antes de publicar)
- Asignación opcional de cancha a cada partido
- Vista pública de torneo, inscripción y zonas (cuando publicadas)
- Consulta de estado de inscripción por lookup_token (sin login)

## Restricciones — NO implementar hasta la versión indicada
- Login de Player: v4
- Resultados / scoring de partidos: v2
- Bracket / fase de llaves: v2
- Posiciones y standings de zona: v2
- Notificaciones por email: v3 (en desarrollo — ver `spec-v3.md`)
- Notificaciones por WhatsApp (envío automático): pospuesto (botón de compartir sí entra en v3)
- Supabase Realtime: v2
- Supabase Storage / streaming / transmisiones: última versión (diferido fuera de v3)
- Rankings y stats: v4
- Gestión de turnos de canchas: v5
- Stripe / pagos: v5

## Decisiones de modelo de datos (no revertir sin discusión)
- La unidad de inscripción es la **pareja** (Pair), no el jugador individual
- Player debe incluir DNI/identificador único desde v1 — es el nexo para vincular
  actividad previa al perfil de jugador en v4 sin migración
- Court debe poder extenderse a disponibilidad/horarios en v5 sin cambios estructurales
- Match reserva `zone_id` nullable para soportar partidos de bracket en v2

## Herramientas / MCPs activos
- GitHub MCP (cuando se agregue)
- Supabase MCP (cuando se agregue)

## Notas de entorno
- Node instalado: v24.16.0 (npm 11.x). Cumple el requisito de Next 16.
- El proyecto vive en `C:\dev\matchpoint-app` (movido fuera de OneDrive para evitar que
  `node_modules` se sincronice y cause lentitud/conflictos).
- Scaffold creado con `create-next-app` (TypeScript, Tailwind, ESLint, App Router,
  carpeta `src/`, alias `@/*`). Git inicializado.
