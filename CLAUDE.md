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
- PWA (instalable + offline) vía Serwist
- Deploy: **Cloudflare Workers** (vía `@opennextjs/cloudflare`, no el "Pages" clásico:
  el adapter `next-on-pages` no soporta Next 16). Ver sección "Deploy (Cloudflare / OpenNext)".

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
**v1 MVP funcionalmente completo.** La apertura de inscripción es **manual** (decisión de producto):
`registration_opens_at` se conserva como dato, pero no se implementa un job programado de apertura
automática (no es un pendiente).

**v2 — slices 1 a 5 completados** (build + lint OK, commiteados): calendario público + QR,
anti-duplicado por email, resultados/scoring, standings de zona + formatos de partido, y fase de
llaves / bracket. **Feature 6 (Realtime / seguimiento en vivo) SUSPENDIDA** (2026-06-13): postergada
por decisión de producto; en su lugar se priorizan refinamientos de UI/UX. Hechos: filtrado público
de zonas funcional (`/t/[id]/zones`), rediseño del manager de zonas (tarjetas de partido compactas +
sección "Partidos" separada de parejas/posiciones), y **botón "compartir campeón"** (share del campeón
en la página de llaves del organizer, `bracket-board.tsx` → `ShareButtons` con `storyUrl` a
`/t/[id]/bracket/og/story`). Especificación en `spec-v2.md`; el detalle granular por slice vive en la
memoria del asistente.

**v3 — comunicaciones: TODOS los slices implementados (build + lint OK, commiteados).** Eje: email
transaccional vía Resend. Hechos: (0) infra de email + `getBaseUrl()`, (1) email de inscripción
pendiente con link de seguimiento, (2) emails de cambio de estado aceptado/rechazado, (3) botón
"Compartir en WhatsApp" en torneo/calendario/campeón, (4) "Compartir en historia de Instagram" con
imagen generada (`next/og`, fuente Archivo embebida), (5) auth por email del organizer (confirmación
real + reset de contraseña; rutas `/auth/confirm`, `/forgot-password`, `/update-password`), (6) seña /
pendiente de pago (sub-estado de `accepted`, migración `0018_pair_deposit.sql`). Decisiones: Resend (no
Gmail SMTP); mails solo al jugador 1; WhatsApp **automático** pospuesto (solo el botón de compartir
entra); transmisiones/streaming diferido a la última versión. **Config de Auth cerrada y validada e2e
(2026-06-18):** SMTP custom → Resend + `mailer_autoconfirm=false`; flujo de **reset de contraseña +
login probado end-to-end con el link real del mail** (Playwright). Gotchas encontrados (documentados en
`spec-v3.md` handoff D/B): (a) en los templates de Auth **NO usar `{{ .Type }}`** — no es variable
válida de GoTrue, renderiza vacío y manda a `/login?error=auth`; hardcodear `type=signup`/`type=recovery`;
(b) los templates se editan **en el dashboard**, no por Management API; (c) `smtp_pass` solo se carga por
dashboard (el Management API lo ignora); (d) Resend sin dominio verificado solo entrega a la casilla
**exacta** de la cuenta (los alias `+` de Gmail se rechazan). **Pendiente:** registro→confirmación e2e
(bloqueado por el dominio de Resend) y demás verificaciones del checklist. Checklist autoritativo en
`spec-v3.md` → **"Pendientes para funcionamiento end-to-end (handoff — cierre de v3)"**.

**Mejoras post-v3.** *Carga manual de parejas por el organizer:* en `/tournaments/[id]/registrations`,
botón "Agregar pareja" → form inline (`add-pair-form.tsx`) + action `addPairManually`. A diferencia del
alta pública (`register_pair`, anon): no exige inscripción abierta (sirve mientras
`canManageRegistrations`), no consume el cupo de pendientes, entra **aceptada directa** (respeta
`max_pairs`) y no manda mail automático. Inserta con **admin client** (la tabla `players` no tiene policy
de INSERT para `authenticated`; la propiedad del torneo se valida antes vía RLS de `tournaments`).
Mantiene el anti-duplicado por email y el requisito de nombre + un contacto por jugador.

## Convenciones de implementación (v1)
> No revertir sin discusión; reflejan decisiones ya validadas en código y verificadas e2e.

### Next 16
- **Middleware en `src/middleware.ts`** (export `middleware`) + `src/lib/supabase/proxy.ts`.
  ⚠️ Next 16 renombró Middleware → **Proxy** (`proxy.ts`, export `proxy`), pero el Proxy corre
  **solo** en runtime Node.js y el adapter de Cloudflare (`@opennextjs/cloudflare`) **aún no soporta
  Node middleware** (opennextjs-cloudflare#962): el build aborta con *"Node.js middleware is not
  currently supported"*. Por eso se usa el nombre legacy `middleware.ts`, que Next 16 todavía emite
  como **edge middleware** (lo único que OpenNext acepta). Volver a `proxy.ts` cuando OpenNext lo
  soporte. (Decisión 2026-06-19, validada e2e en preview de workerd.)
- `cookies()` es async; los `params` de página/route son `Promise` → siempre `await`.
- La protección de rutas del middleware es **optimista**: cada página del área organizer revalida con
  `supabase.auth.getUser()` y redirige a `/login` por su cuenta.

### PWA (instalable + offline)
La app es una **PWA**: mismo deploy sirve web normal y "app instalada" (no hay build separado;
instalar es opcional por usuario, el acceso web queda intacto). Decisión y roadmap en el plan
`ayudame-a-refinar-y-velvety-star.md` (resumen: nativo pospuesto; compartir a IG Stories pulido
requiere app nativa y ni así da link clickeable, por eso se mantiene el flujo actual de share).
- **Manifest**: `src/app/manifest.ts` (metadata route → `/manifest.webmanifest`, auto-linkeado).
- **Íconos**: `public/icon.svg` (any) + `public/icon-maskable.svg` (safe-zone); apple-touch-icon
  se genera con `next/og` en `src/app/apple-icon.tsx` (iOS no lee el manifest y exige PNG).
- **Service worker**: Serwist. `src/app/sw.ts` (fuente) → `public/sw.js` (generado, gitignored).
  Config en `next.config.ts` (`withSerwist`, `disable` en dev). El área autenticada
  (`/dashboard`, `/courts`, `/tournaments/*`) es **NetworkOnly** (no se cachea PII); las vistas
  públicas usan `defaultCache` → offline una vez visitadas.
- **Serwist usa webpack, no Turbopack** → `npm run build` corre con `--webpack`. El SW se desactiva
  en dev, así que `npm run dev` sigue con Turbopack; para probar offline: `npm run build && npm run start`.
- **Pendiente (Fase 2)**: push notifications (Web Push / VAPID) sobre la PWA.

### Deploy (Cloudflare / OpenNext)
La app se despliega a **Cloudflare Workers** con `@opennextjs/cloudflare` (no "Pages": el adapter
viejo no soporta Next 16). Corre en el runtime de Workers (`nodejs_compat`), **no edge**.
- **Config**: `wrangler.jsonc` (`nodejs_compat` + `global_fetch_strictly_public`, compat date
  `2024-12-30`, binding `ASSETS`) + `open-next.config.ts` (mínima, sin caché incremental R2 por ahora).
  `next.config.ts` llama `initOpenNextCloudflareForDev()` (solo afecta `next dev`).
- **Scripts**: `npm run preview` (build + workerd local), `npm run deploy` (build + deploy),
  `npm run cf-typegen`. El `build` interno sigue siendo `next build --webpack` (Serwist). Generado:
  `.open-next/` (gitignored, ESLint-ignored). Secrets locales del preview: `.dev.vars` (gitignored).
- ⚠️ **Edge runtime no soportado**: se quitó `export const runtime = 'edge'` de las 3 rutas OG/story
  (`*/og/story/route.tsx`); `ImageResponse` corre igual en el runtime de Workers.
- ⚠️ **Fuentes OG embebidas**: en Workers no se puede `fetch(new URL(..., import.meta.url))` un asset,
  así que los .ttf de Archivo van en base64 en `src/lib/og/fonts.generated.ts` (regenerar con
  `node scripts/generate-og-fonts.mjs` si cambian; fuente de verdad: `src/lib/og/fonts/*.ttf`).
- ⚠️ **Windows**: el preview local tira warning de incompatibilidad y puede fallar de forma errática;
  el deploy real (Workers Builds, corre en Linux) no se ve afectado. Validado e2e igual en workerd
  local (2026-06-19): home/login/register 200, redirect de auth, y las 3 OG renderizan PNG.
- **LIVE (2026-06-19)**: worker `app` deployado vía `npm run deploy` (local, `wrangler login`) en
  **`https://app.match-point.workers.dev`**. Smoke test e2e en prod OK: home/login/register 200,
  redirect de auth, OG/story PNG. Secrets de runtime seteados con `wrangler secret put`
  (`SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `EMAIL_FROM`). Supabase Auth: `site_url` =
  prod + `uri_allow_list` = local + prod (`/**`). `NEXT_PUBLIC_SITE_URL` se deja en localhost: en prod
  `getBaseUrl()` usa el host del request (el fallback no aplica para emails/OG, que corren in-request).
  Subdominio de cuenta cambiado a `match-point` (se hizo desde el dashboard; el API rechaza cambiar uno
  ya existente, error 10036). Al cambiarlo hubo ~minutos de delay por provisión del cert TLS del nuevo
  subdominio + un redeploy para re-publicar el worker.
- **Pendientes (lado Cloudflare, opcionales)**: (b) borrar el worker huérfano `matchpoint-app`
  (de un deploy fallido previo al rename); (c) dominio propio (Custom Domain) para el lanzamiento;
  (d) migrar a Workers Builds (CI desde GitHub) si se quiere deploy automático por push; (e) dominio
  verificado en Resend para mandar mails a cualquier destinatario (hoy solo a la casilla de la cuenta).

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
