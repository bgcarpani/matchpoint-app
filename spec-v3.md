# Matchpoint App — Spec v3

## Alcance
Este documento cubre la **versión 3** completa y es **autosuficiente** para arrancar la
implementación en una sesión nueva. El eje de v3 son las **comunicaciones con el usuario**:

1. **Infraestructura de email transaccional** (Resend) — base de todo lo demás.
2. **Email de inscripción pendiente** al jugador, con link de seguimiento.
3. **Email al cambiar de estado** de la solicitud (aceptado / rechazado).
4. **Auth por email del organizer** — confirmación real + reset de contraseña (completa lo que en v1
   quedó con `mailer_autoconfirm`).
5. **Botones "Compartir en WhatsApp"** en torneo, calendario público y campeón.
6. **Botón "Compartir en historia de Instagram"** con imagen generada.

El "qué/por qué" cross-versión vive en `functional-doc.md`. Las convenciones de implementación
(Next 16, Supabase, RLS, vistas seguras + RPCs, validación/UI) son las mismas de v1/v2 — ver
`CLAUDE.md`, `spec.md` y `spec-v2.md`. Acá se documentan solo los **deltas** sobre lo ya construido.

> **Decisiones de producto cerradas al inicio de v3:**
> - Proveedor de email: **Resend** (descartado Gmail SMTP por entregabilidad/límites). El mismo
>   proveedor se reutiliza como **SMTP de Supabase Auth**.
> - Destinatario de los mails de inscripción/estado: **solo el jugador 1** (quien carga la solicitud).
> - Instagram: **generación de imagen real** para historia (no compartir solo texto).
> - Auth: flujo **completo** (confirmación de email + "olvidé mi contraseña").
> - **WhatsApp como canal de notificación automática: pospuesto** (ver "WhatsApp: factibilidad").
>   En v3 entra solo el **botón de compartir** por WhatsApp (click-to-chat), no el envío automático.
> - **Transmisiones / streaming** (antes tentativamente en v3) se **difiere a la última versión**.

### Orden sugerido de slices
0. Infra de email (Resend) + helper de URL absoluta — base, bloquea a 1, 2 y 3.
1. Email de inscripción pendiente — Feature 1.
2. Emails de cambio de estado (aceptado / rechazado) — Feature 2.
3. Botones "Compartir en WhatsApp" — Feature 4 (independiente del email, bajo riesgo).
4. "Compartir en historia de Instagram" con imagen — Feature 5.
5. Auth por email (confirmación + reset) — Feature 3 (el más invasivo en el flujo de login; al final).

---

## WhatsApp: factibilidad (decisión registrada)

Se separan dos cosas distintas que conviene no confundir:

- **Botón "Compartir en WhatsApp"** (*click-to-chat*): trivial, sin API ni costo. Es un link
  `https://wa.me/?text=<texto+url>` que abre WhatsApp con el mensaje pre-armado. **Entra en v3**
  (Feature 4).
- **Notificación automática por WhatsApp** (replicar los mails de inscripción/estado por WhatsApp):
  técnicamente posible con la **WhatsApp Business Cloud API** (Meta) o vía Twilio, pero requiere
  cuenta de WhatsApp Business, número verificado, **plantillas de mensaje (HSM) pre-aprobadas por
  Meta** para enviar fuera de la ventana de 24 h, y **costo por mensaje**. Es bastante más pesado que
  el email y depende de aprobación externa. El teléfono ya está en `players.phone`, así que es
  factible más adelante reusando la misma capa de notificación. **Pospuesto** hasta validar el email.

---

## Modelo de datos — deltas v3

> v3 **no agrega columnas nuevas** a las tablas de negocio. Toda la data necesaria ya existe:
> `players.email` / `players.phone`, `pairs.lookup_token`, `pairs.status`, `tournaments.name`,
> `organizers.calendar_slug`. Los cambios de v3 viven en **infraestructura** (proveedor de email,
> config de Supabase Auth) y **código de app** (server actions, route handlers, componentes).

### Config de Supabase Auth (delta — Feature 3)
- `mailer_autoconfirm`: pasa de `true` (DEV de v1) a **`false`** → la confirmación de email vuelve
  obligatoria.
- **SMTP custom** apuntando a Resend.
- **Site URL** + **Redirect URLs** (local + Cloudflare) configuradas para los links de confirmación y
  recovery.

---

## Stack nuevo / dependencias
- **`resend`** — SDK de envío; funciona sobre `fetch`, compatible con edge/Cloudflare.
- **`next/og` (`ImageResponse`)** — generación de la imagen de Instagram; ya incluido en Next 16, sin
  dependencia extra.
- Reutilizar **`qrcode.react`** (instalado en v2) para incrustar el QR dentro de la imagen de historia.
- **Variables de entorno nuevas** (`.env.local` + `.env.example`):
  - `RESEND_API_KEY` — API key de Resend (server-only).
  - `EMAIL_FROM` — remitente, ej. `Matchpoint <noreply@tudominio>`.
  - `NEXT_PUBLIC_SITE_URL` — fallback para construir URLs absolutas donde no hay request headers.

> **Prerrequisito manual (fuera de código):** verificar un **dominio remitente** en Resend (o usar
> `onboarding@resend.dev` para pruebas en dev). Sin dominio verificado, Resend solo envía a la casilla
> de la cuenta.

> **Nota Next 16 / Cloudflare:** `ImageResponse` corre en **edge runtime** (soportado por Cloudflare
> Pages). Resend va por `fetch` (ok en edge). Validar el build de Cloudflare al cerrar cada slice.

---

## Slice 0 — Infraestructura de email (base)

### Objetivo
Una capa de envío reutilizable, resiliente y centralizada, más un helper único para armar URLs
absolutas. **Regla de oro:** un fallo de email **nunca** debe romper la acción de negocio que lo
dispara (inscripción, accept/reject).

### Implementación
- **`src/lib/email/client.ts`** — instancia de Resend desde `RESEND_API_KEY`.
- **`src/lib/email/send.ts`** — wrapper `sendEmail({ to, subject, html })` que envuelve todo en
  `try/catch`, **no lanza**, loguea el error y devuelve `{ ok: boolean }`.
- **`src/lib/email/templates.ts`** — funciones que devuelven HTML es-AR por tipo de mail (pending,
  accepted, rejected), con un layout común (header Matchpoint, estilos inline, tema oscuro). Sin
  `react-email` para no sumar dependencias.
- **`src/lib/url.ts`** — helper `getBaseUrl()` que usa `headers()` (mismo patrón proto/host ya presente
  en `src/app/tournaments/[id]/page.tsx` y `src/app/dashboard/page.tsx`), con fallback a
  `NEXT_PUBLIC_SITE_URL`. Centraliza la construcción de URL absoluta hoy duplicada inline.

### Criterios de aceptación
- [ ] `sendEmail` envía vía Resend y, ante error, devuelve `{ ok: false }` sin lanzar.
- [ ] `getBaseUrl()` resuelve la URL absoluta correcta en local y producción.
- [ ] Las plantillas renderizan HTML válido es-AR con el branding de Matchpoint.

---

## Slice 1 — Feature 1: Email de inscripción pendiente

### Objetivo
Al enviar una solicitud de inscripción, el jugador 1 recibe un correo confirmando que su solicitud
quedó **pendiente**, con el **link de seguimiento** (`/inscription/<token>`).

### Reglas de negocio
- Se envía **solo al `player1.email`** (contacto principal). Si el jugador 1 no tiene email (solo
  teléfono), no se envía (no es error).
- El envío ocurre **después** del `register_pair` exitoso y **no condiciona** el resultado de la
  inscripción (try/catch vía `send.ts`).
- El mail incluye nombre del torneo, estado "pendiente" y el link de seguimiento.

### Acceso a datos
| Operación | Implementación |
|---|---|
| Enviar mail de pendiente | delta en `registerPair` — `src/app/t/[tournamentId]/actions.ts` |

> El `input` de `registerPair` ya trae `player1.email` y el RPC devuelve el `token` → el link se arma
> con `getBaseUrl()` sin queries extra para el destinatario. El nombre del torneo se obtiene con una
> lectura liviana o se pasa desde el form.

### Criterios de aceptación
- [ ] Al inscribir una pareja, el jugador 1 recibe el mail de "solicitud pendiente".
- [ ] El link del mail abre `/inscription/<token>` y muestra el estado pendiente.
- [ ] Si el envío falla, la inscripción igual se completa (no se rompe el flujo).
- [ ] Un jugador 1 sin email no genera error.

---

## Slice 2 — Feature 2: Emails de cambio de estado (aceptado / rechazado)

### Objetivo
Cuando el organizer acepta o rechaza una solicitud, el jugador 1 recibe un correo informando el nuevo
estado, **aclarando que en el futuro se sumará información adicional** (horarios, zona, etc.).

### Reglas de negocio
- Se envía **solo al `player1.email`**, **después** del cambio de estado exitoso, en try/catch.
- Dos plantillas: **aceptado** y **rechazado**. Ambas incluyen el link de seguimiento y la aclaración
  de "más información próximamente".
- `removePair` **no** envía email: borra a los players (el destinatario deja de existir).

### Acceso a datos
| Operación | Implementación |
|---|---|
| Cargar email J1 + token + nombre de torneo | delta en `loadOwnedPair` (join `pairs → players` por `player1_id`) — `src/app/tournaments/[id]/registrations/actions.ts` |
| Enviar mail de aceptado/rechazado | delta en `acceptPair` / `rejectPair` (post-update) |

### Criterios de aceptación
- [ ] Aceptar una solicitud envía el mail "aceptado" con link de seguimiento y la aclaración de info futura.
- [ ] Rechazar una solicitud envía el mail "rechazado" equivalente.
- [ ] Remover una pareja **no** envía email.
- [ ] Un fallo de envío no rompe el accept/reject.

---

## Slice 3 — Feature 4: Botones "Compartir en WhatsApp"

### Objetivo
Permitir compartir por WhatsApp, con un click, el torneo (organizer), el calendario público y el
campeón una vez finalizadas las llaves.

### Reglas de negocio
- Click-to-chat: `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`. Sin API ni costo.
- La **URL absoluta se arma server-side** (vía `getBaseUrl()` / headers existentes) y se pasa como
  prop al componente client.

### Implementación
- **Componente reutilizable** `src/components/share/share-buttons.tsx` (client): recibe `url` y `text`
  y renderiza el botón de WhatsApp. (El contrato se deja preparado para sumar el botón de Instagram en
  Slice 4.)

### Superficies
| Superficie | Archivo | Ubicación |
|---|---|---|
| Torneo (organizer) | `src/components/tournaments/share-registration-link.tsx` | fila de acciones (cumple el `TODO(v3 — compartir)` ya escrito ahí) |
| Calendario público | `src/components/organizer/calendar-share-panel.tsx` | fila de acciones, compartiendo `calendarUrl` |
| Campeón (post-llaves) | `src/app/t/[tournamentId]/bracket/page.tsx` | bajo el bloque de campeón (usar `getBaseUrl()` para el link del torneo) |

### Criterios de aceptación
- [ ] En el detalle del torneo, el organizer puede compartir el link de inscripción por WhatsApp.
- [ ] En el calendario público, se puede compartir la URL del calendario por WhatsApp.
- [ ] En la vista pública de llaves finalizadas, se puede compartir el campeón por WhatsApp.
- [ ] El texto + link compartido es correcto y absoluto en local y producción.

---

## Slice 4 — Feature 5: "Compartir en historia de Instagram" (imagen real)

### Objetivo
Compartir una **imagen estilizada** lista para subir como historia de Instagram. Instagram **no**
admite compartir por URL desde la web; una historia necesita una imagen, así que se genera una.

### Implementación
- **Imágenes generadas** con `ImageResponse` de `next/og`, formato **1080×1920**, branding (azul noche
  + volt), con nombre del torneo / campeón y **QR** al link público. Route handlers nuevos:
  - `src/app/t/[tournamentId]/og/story/route.tsx` — tarjeta del torneo.
  - `src/app/t/[tournamentId]/bracket/og/story/route.tsx` — tarjeta del campeón.
  - `src/app/o/[slug]/og/story/route.tsx` — tarjeta del calendario.
- **Botón "Compartir en historia"** en `share-buttons.tsx`:
  - Hace `fetch` de la imagen como `Blob`/`File` y llama `navigator.share({ files: [file] })` → en
    mobile el usuario elige Instagram → "Agregar a tu historia".
  - **Fallback** (desktop / Web Share Level 2 no soportado): descarga la imagen + abre `instagram.com`
    con un texto guía ("descargá la imagen y subila a tu historia").

> **Limitación conocida:** compartir solo texto/URL a Instagram **no** llega a una historia; por eso se
> genera imagen. El soporte de `navigator.share` con archivos es principalmente mobile.

### Criterios de aceptación
- [ ] Cada route `/og/story` devuelve una imagen 1080×1920 con el branding y el QR correctos.
- [ ] En mobile compatible, el botón abre el share sheet con la imagen lista para historia.
- [ ] En desktop / no soportado, el botón descarga la imagen y abre Instagram con la guía.
- [ ] El botón convive con el de WhatsApp en las tres superficies (torneo, calendario, campeón).

---

## Slice 5 — Feature 3: Auth por email del organizer (confirmación + reset)

### Objetivo
Completar el ciclo de auth que en v1 quedó con `mailer_autoconfirm=true`: **confirmación de email
real** al registrarse y **reset de contraseña** ("olvidé mi contraseña"), enviados vía Resend.

### Config (Supabase Auth)
- SMTP custom → Resend; `mailer_autoconfirm = false`.
- Site URL + Redirect URLs (local + Cloudflare).
- Templates de Auth en es-AR (opcional pero recomendado).

### Implementación
- **Route handler** `src/app/auth/confirm/route.ts`: valida `token_hash` con
  `supabase.auth.verifyOtp({ type, token_hash })` y redirige a `/dashboard` (confirmación) o a la
  pantalla de nueva contraseña (recovery). Params `Promise` en Next 16 → `await`.
- **Registro** (`src/app/(auth)/actions.ts` `registerOrganizer`): con confirmación obligatoria, `signUp`
  ya **no** crea sesión → reemplazar el `redirect('/dashboard')` por una pantalla "Revisá tu email
  para confirmar tu cuenta".
- **Olvidé mi contraseña** — `src/app/(auth)/forgot-password/page.tsx` + form que llama
  `supabase.auth.resetPasswordForEmail(email, { redirectTo })`. Link "¿Olvidaste tu contraseña?" en la
  página de login.
- **Nueva contraseña** — `src/app/(auth)/update-password/page.tsx` (post-link de recovery) que llama
  `supabase.auth.updateUser({ password })`.
- Reusar `TextField`, `Button`, `react-hook-form + zod` (patrón de `login-form.tsx` / `register-form.tsx`)
  y extender `src/lib/validation/auth.ts`.

### Criterios de aceptación
- [ ] Registrar un organizer nuevo dispara un mail de confirmación; sin confirmar no se puede entrar.
- [ ] Confirmar el email desde el link deja al organizer logueado en `/dashboard`.
- [ ] "Olvidé mi contraseña" envía el mail de recovery y permite setear una nueva contraseña end-to-end.
- [ ] `mailer_autoconfirm=false` confirmado en la config de Auth.

---

## Rutas — resumen v3

### Organizer (autenticada)
| Ruta | Delta/Nueva | Descripción |
|---|---|---|
| `/tournaments/[id]` | delta | Botones de compartir (WhatsApp + Instagram) del link de inscripción |
| `/dashboard` | delta | Botones de compartir del calendario público |
| `/register` | delta | Tras signUp, pantalla "revisá tu email" (ya no entra directo) |
| `/login` | delta | Link "¿Olvidaste tu contraseña?" |
| `/forgot-password` | nueva | Pide email y dispara recovery |
| `/update-password` | nueva | Setea nueva contraseña tras el link de recovery |

### Sistema / pública (sin login)
| Ruta | Delta/Nueva | Descripción |
|---|---|---|
| `/auth/confirm` | nueva | Route handler que valida token de confirmación/recovery |
| `/t/[id]/bracket` | delta | Botones de compartir del campeón |
| `/t/[id]/og/story` | nueva | Imagen de historia (torneo) |
| `/t/[id]/bracket/og/story` | nueva | Imagen de historia (campeón) |
| `/o/[slug]/og/story` | nueva | Imagen de historia (calendario) |

---

## Resumen de deltas técnicos v3
- **Sin migraciones SQL de tablas de negocio.** Toda la data necesaria ya existe.
- **Config de Supabase Auth** (vía Management API / dashboard): SMTP de Resend, `mailer_autoconfirm=false`,
  Site/Redirect URLs, templates es-AR.
- **Dependencias nuevas:** `resend` (`next/og` ya viene con Next 16; `qrcode.react` ya está).
- **Variables de entorno:** `RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_SITE_URL`.
- **Capa nueva:** `src/lib/email/` (client/send/templates) + `src/lib/url.ts`.
- **Server actions con delta:** `registerPair` (Slice 1), `acceptPair`/`rejectPair` + `loadOwnedPair`
  (Slice 2), `registerOrganizer` (Slice 5).
- **Componentes/route handlers nuevos:** `share-buttons.tsx`, `/og/story` (×3), `/auth/confirm`,
  `forgot-password`, `update-password`.
- **Diferido a la última versión:** transmisiones / streaming (sale de v3).
