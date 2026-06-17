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
7. **Seña / pendiente de pago de inscripción** — sub-estado de pago tras aceptar, con aviso manual
   (WhatsApp + email) al jugador 1.

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
> - **Seña (pago de inscripción de 1 jugador):** el pago ocurre **100% fuera de la app** (transferencia /
>   MP / efectivo). La app **no** recibe comprobantes ni datos bancarios: solo lleva el **estado** de la
>   seña. "Pendiente de seña" es un **sub-estado de `accepted`**, no un status nuevo (el enum sigue
>   manejando cupo y zonas). El aviso es **manual** (botón), no automático, para poder no avisar si ya
>   pagaron. Mensaje **genérico y sutil**, sin monto ni datos de pago. El organizer marca la seña a mano
>   y, sin plazo fijo, puede **rechazar por falta de pago**.

### Orden sugerido de slices
0. Infra de email (Resend) + helper de URL absoluta — base, bloquea a 1, 2 y 3.
1. Email de inscripción pendiente — Feature 1.
2. Emails de cambio de estado (aceptado / rechazado) — Feature 2.
3. Botones "Compartir en WhatsApp" — Feature 4 (independiente del email, bajo riesgo).
4. "Compartir en historia de Instagram" con imagen — Feature 5.
5. Auth por email (confirmación + reset) — Feature 3 (el más invasivo en el flujo de login; al final).
6. Seña / pendiente de pago — Feature 7 (extiende el Slice 2; única migración SQL de v3).

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

> v3 agrega **una sola columna** (`pairs.deposit_paid_at`, en el Slice 6 — seña). El resto de la data
> ya existe: `players.email` / `players.phone`, `pairs.lookup_token`, `pairs.status`, `tournaments.name`,
> `organizers.calendar_slug`. Los demás cambios de v3 viven en **infraestructura** (proveedor de email,
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
- **`qrcode.react`** (instalado en v2) sigue usándose para el QR en pantalla del calendario, **no** en
  la imagen de historia (ver Slice 4: la historia se ve desde el mismo celular, el QR no aplica).
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

> **Modificado por el Slice 6 (seña):** el mail de **aceptado deja de ser automático** y pasa a ser
> manual (botón), para que el organizer pueda no avisar si la seña ya fue pagada. El de **rechazado
> sigue automático**. Ver Slice 6 para el detalle.

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
  + volt), con nombre del torneo / campeón y la **URL pública impresa como CTA legible** (sin QR; ver
  decisión abajo). Composición con **safe zones**: contenido en la franja superior/central, tercio
  inferior libre para que la persona ubique ahí el sticker de enlace. Route handlers:
  - `src/app/t/[tournamentId]/og/story/route.tsx` — tarjeta del torneo.
  - `src/app/t/[tournamentId]/bracket/og/story/route.tsx` — tarjeta del campeón.
  - `src/app/o/[slug]/og/story/route.tsx` — tarjeta del calendario.
- **Botón "Compartir en historia"** en `share-buttons.tsx`:
  - **Copia la URL al portapapeles** (`navigator.clipboard`) para que agregar el link sea un solo pegar.
  - Hace `fetch` de la imagen como `Blob`/`File` y llama `navigator.share({ files: [file] })` → en
    mobile el usuario elige Instagram → "Agregar a tu historia".
  - **Fallback** (desktop / Web Share Level 2 no soportado): descarga la imagen + abre `instagram.com`.
  - Muestra una **guía inline**: "subí la historia → sticker de Enlace → pegar".

> **Decisión (2026-06-15): sin QR + link sticker manual.** El objetivo ideal era una historia
> *clickeable* generada/subida por nosotros, pero **no es posible desde web**: agregar un link sticker
> requiere la app nativa de Instagram + Sharing SDK (pasteboard iOS / `instagram-stories://share` con
> Facebook App ID). El navegador solo puede compartir la **imagen**. Además, el QR no aplica: la historia
> se ve desde el mismo celular que la comparte, así que es inescaneable. Por eso: se elimina el QR, se
> imprime la URL como CTA, se copia el link al portapapeles y se guía a pegarlo en el sticker de Enlace
> (clickeable, disponible hoy para todas las cuentas). El soporte de `navigator.share` con archivos es
> principalmente mobile.

### Criterios de aceptación
- [ ] Cada route `/og/story` devuelve una imagen 1080×1920 con branding, URL legible como CTA y
      contenido dentro de las safe zones (sin QR).
- [ ] En mobile compatible, el botón copia el link, abre el share sheet con la imagen y muestra la guía.
- [ ] En desktop / no soportado, el botón descarga la imagen, abre Instagram y muestra la guía.
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
- [x] Registrar un organizer nuevo dispara un mail de confirmación; sin confirmar no se puede entrar.
- [x] Confirmar el email desde el link deja al organizer logueado en `/dashboard`.
- [x] "Olvidé mi contraseña" envía el mail de recovery y permite setear una nueva contraseña end-to-end.
- [ ] `mailer_autoconfirm=false` confirmado en la config de Auth. *(config manual — ver abajo)*

> **Código completo (build + lint OK).** El flujo end-to-end depende de **config manual en Supabase
> Auth** (no se hace por código), pendiente de cerrar en el dashboard / Management API:
> 1. **SMTP custom → Resend** y `mailer_autoconfirm = false`.
> 2. **Site URL + Redirect URLs** con el dominio local y el de Cloudflare (deben incluir `/auth/confirm`).
> 3. **Templates de Auth (Confirm signup / Reset password)** apuntando al flujo `token_hash`:
>    `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type={{ .Type }}` (el de recovery agrega
>    `&next=/update-password`). Sin este cambio, el link por defecto usa el flujo PKCE (`?code=`) y
>    `verifyOtp` no aplica.
> Decisiones de código: `requestPasswordReset` responde siempre `{ ok: true }` (anti-enumeración de
> emails); `registerOrganizer` pasa de `redirect('/dashboard')` a `{ ok: true }` + pantalla "Revisá tu
> email"; `/auth/confirm` redirige a `/login?error=auth` ante token inválido/expirado.

---

## Slice 6 — Feature 7: Seña / pendiente de pago de inscripción

### Contexto
La **seña** es el pago de la inscripción de **un** jugador (la mitad de la pareja) que el organizer
cobra para confirmar el lugar. El **pago ocurre 100% fuera de la app** (transferencia / Mercado Pago /
efectivo); la app **no** recibe comprobantes ni datos bancarios — solo lleva el **estado** de la seña
para que el organizer sepa a quién le falta pagar. Hoy las inscripciones llegan por WhatsApp / DM de
Instagram, así que el aviso se apoya en ese canal (el organizer ya tiene el chat abierto).

### Decisiones cerradas
- **"Pendiente de seña" es un sub-estado de `accepted`, no un status nuevo.** El enum `pairs.status`
  (pending/accepted/rejected) sigue manejando **cupo** (`count accepted >= max_pairs`) y **generación de
  zonas**: una pareja aceptada cuenta y juega aunque no haya pagado. La dimensión de pago es independiente.
- **Aviso manual, no automático.** Aceptar deja de mandar mail solo (cambia el Slice 2). El organizer
  dispara el aviso con botones (WhatsApp y/o email) cuando quiere, para poder **no** avisar si ya le
  pagaron de antemano.
- **El organizer marca la seña a mano** (`Seña recibida`). **Sin plazo fijo**: queda a su criterio
  perseguir el pago y, si no llega, **rechazar** la pareja por falta de pago (reusa el flujo de rechazo).
- **Mensaje genérico y sutil**, sin monto ni datos de pago (eso lo coordina el organizer en la
  conversación). Sin campos nuevos en el torneo.

### Modelo de datos (única migración SQL de v3)
`supabase/migrations/0018_pair_deposit.sql`:
```sql
alter table pairs add column deposit_paid_at timestamptz;
```
- **Semántica:** `status='accepted'` + `deposit_paid_at is null` → *pendiente de seña*;
  `deposit_paid_at is not null` → *seña recibida* (además registra el cuándo). En pending/rejected la
  columna es irrelevante (queda null).
- **Sin exposición pública:** `public_pair_view` (0002) selecciona columnas explícitas → la nueva
  columna **no** se filtra a anon. RLS cubierta por `pairs_all_owner` (organizer-only).
- Aplicar con `npm run db:apply -- 0018`. Verificar con la anon key que `deposit_paid_at` no aparezca
  en `public_pair_view`.

### Reglas de negocio
- El sub-estado de seña aplica **solo** a parejas `accepted`.
- `acceptPair` **ya no** envía mail (se elimina `notifyStatusChange(...,'accepted')`). `rejectPair`
  mantiene su mail automático.
- Marcar / desmarcar seña: solo sobre parejas propias y `accepted`; best-effort + revalidate.
- Aviso por **email**: solo si `player1.email` existe; best-effort (try/catch vía `send.ts`), no rompe nada.
- Aviso por **WhatsApp**: client-side `wa.me`, dirigido a `player1.phone` normalizado si existe; si no,
  abre WhatsApp sin destinatario (el organizer elige el chat). El teléfono es texto libre →
  normalización best-effort (solo dígitos); números mal cargados caen al chat manual.
- **Rechazo por falta de pago:** se habilita el botón **Rechazar** también en parejas `accepted` (hoy
  solo aparece en `pending`).

### Acceso a datos / acciones (`src/app/tournaments/[id]/registrations/actions.ts`)
| Operación | Implementación |
|---|---|
| Quitar mail automático de aceptado | delta en `acceptPair` (remover la llamada a `notifyStatusChange(...,'accepted')`) |
| Marcar seña recibida | nueva action `markDepositPaid(pairId)` → `update deposit_paid_at = now()` |
| Deshacer seña | nueva action `unmarkDepositPaid(pairId)` → `update deposit_paid_at = null` |
| Avisar aceptado+seña por email | nueva action `notifyAcceptedByEmail(pairId)` (reusa `acceptedEmail`, ahora manual) |

### Plantillas / mensajes
- `acceptedEmail` (`src/lib/email/templates.ts`): se reescribe el copy → "tu inscripción quedó **aceptada**
  y **pendiente de seña**, coordinamos el pago" (sutil), conservando el link de seguimiento. Pasa de
  envío automático a manual.
- **`src/lib/share/messages.ts`** (nuevo, client-safe, sin deps server):
  - `depositWhatsappText({ playerName, tournamentName, trackUrl })` → texto plano espejo del email para
    el `wa.me`. Mantiene email y WhatsApp diciendo lo mismo.
  - `toWhatsappNumber(phone): string | null` → deja solo dígitos; vacío → `null`.

### UI (`registration-table.tsx` + `registrations/page.tsx`)
- **`page.tsx`:** el `select` de `pairs` agrega `lookup_token, deposit_paid_at`; `RegistrationRow` suma
  `lookup_token` y `deposit_paid_at`; se pasan `tournamentName` y `baseUrl` (`getBaseUrl()`) a
  `<RegistrationTable>`.
- **Badge de seña** en parejas aceptadas: **Pendiente de seña** (ámbar) / **Seña recibida** (verde),
  junto al pill de estado.
- **Acciones nuevas en parejas `accepted`:**
  - **Avisar por WhatsApp** (link `wa.me`, abre pestaña).
  - **Avisar por email** (llama `notifyAcceptedByEmail`, feedback "enviado"; oculto si J1 no tiene email).
  - **Seña recibida** / **Deshacer** (toggle `markDepositPaid` / `unmarkDepositPaid`).
  - **Rechazar** ahora también disponible (rechazo por falta de pago).
- **Filtro nuevo "Pendiente de seña"** (aceptadas sin pago) para ver de un vistazo quién debe.

### Criterios de aceptación
- [x] Aceptar una pareja **no** dispara mail automático; queda `accepted` con badge "Pendiente de seña".
- [x] El botón WhatsApp abre `wa.me` con el aviso pre-armado (sutil) y, si hay teléfono, dirigido al J1.
- [x] "Avisar por email" envía el correo de aceptado+seña solo si el J1 tiene email; un fallo no rompe nada.
- [x] "Seña recibida" marca la pareja (badge verde) y "Deshacer" la vuelve a pendiente.
- [x] Una pareja aceptada puede **rechazarse** por falta de pago (botón Rechazar disponible en `accepted`).
- [x] El filtro "Pendiente de seña" lista solo aceptadas sin pago.
- [x] `public_pair_view` no expone `deposit_paid_at` (vista con columnas explícitas → no se filtra a anon).
- [x] Build + lint OK.

---

## Rutas — resumen v3

### Organizer (autenticada)
| Ruta | Delta/Nueva | Descripción |
|---|---|---|
| `/tournaments/[id]` | delta | Botones de compartir (WhatsApp + Instagram) del link de inscripción |
| `/tournaments/[id]/registrations` | delta | Badge + acciones de seña (avisar WhatsApp/email, marcar pago, rechazar) |
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
- **Una sola migración SQL:** `0018_pair_deposit.sql` (`pairs.deposit_paid_at`, Slice 6). El resto sin
  cambios de tablas.
- **Config de Supabase Auth** (vía Management API / dashboard): SMTP de Resend, `mailer_autoconfirm=false`,
  Site/Redirect URLs, templates es-AR.
- **Dependencias nuevas:** `resend` (`next/og` ya viene con Next 16; `qrcode.react` ya está).
- **Variables de entorno:** `RESEND_API_KEY`, `EMAIL_FROM`, `NEXT_PUBLIC_SITE_URL`.
- **Capa nueva:** `src/lib/email/` (client/send/templates) + `src/lib/url.ts` + `src/lib/share/messages.ts`
  (Slice 6).
- **Server actions con delta:** `registerPair` (Slice 1), `acceptPair`/`rejectPair` + `loadOwnedPair`
  (Slice 2), `registerOrganizer` (Slice 5); `acceptPair` + nuevas `markDepositPaid` /
  `unmarkDepositPaid` / `notifyAcceptedByEmail` (Slice 6).
- **Componentes/route handlers nuevos:** `share-buttons.tsx`, `/og/story` (×3), `/auth/confirm`,
  `forgot-password`, `update-password`. **Delta:** `registration-table.tsx` + `registrations/page.tsx`
  (Slice 6).
- **Diferido a la última versión:** transmisiones / streaming (sale de v3).
