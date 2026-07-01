# Matchpoint App — Spec: Tablero de turnos

## Alcance

Este documento cubre la feature **Tablero de turnos** (`/turnos`), pensada como la primera
sección orientada a **jugadores** (sin login) dentro de la plataforma. Es autosuficiente para
arrancar la implementación en una sesión nueva. Las convenciones de implementación (Next 16,
Supabase, RLS, Server Actions, validación/UI) son las mismas del resto del proyecto — ver
`CLAUDE.md`. Acá se documentan solo los deltas específicos de esta feature.

### Qué es

Un tablero público donde cualquier jugador puede publicar que tiene **un turno de cancha
reservado y le faltan compañeros**. Otros jugadores pueden verlo y contactarse directamente
por WhatsApp o Instagram. Sin login, sin intermediación de la app en la comunicación.

### Decisiones de producto cerradas

- **Sin login para crear o leer.** El acceso de escritura se controla por un **token de
  gestión** generado al crear el turno (link único tipo `/turnos/[id]/editar?token=xxx`).
- **Sin integración con los torneos/organizadores** de la plataforma. Las canchas son texto
  libre; cualquier cancha del mundo puede aparecer acá.
- **La comunicación sucede fuera de la app** (WhatsApp / Instagram). La app genera los deep
  links; no almacena ni registra los contactos realizados.
- **Expiración lazy:** no hay cron job. Cada vez que se carga la lista se filtran los turnos
  cuyo `start_time < NOW() - INTERVAL '30 minutes'`. No es un estado en la base de datos.
- **Moderación:** fuera de scope en esta versión. Si aparece spam se maneja reactivamente.
- **Persistencia en el mismo dispositivo:** el token de gestión se guarda en `localStorage`
  para que el creador pueda volver a editar sin necesitar el link.

### Orden sugerido de implementación

1. Migración SQL + tabla `shifts` — base de todo.
2. `/turnos` — lista pública con filtros y tarjetas (solo lectura).
3. `/turnos/nuevo` — formulario + Server Action de creación + redirect con token.
4. `/turnos/[id]/editar` — formulario pre-llenado + Server Actions de actualización/cierre.
5. Deep links de contacto (WhatsApp / Instagram) en las tarjetas.
6. Persistencia del token en `localStorage` + badge "Tuyo" en la lista.

---

## Modelo de datos

### Tabla `shifts`

```sql
-- supabase/migrations/0021_shifts.sql

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

-- Índice para la query principal (lista ordenada por proximidad, excluyendo expirados)
create index shifts_start_time_idx on shifts (start_time asc)
  where status != 'closed';

-- RLS: lectura pública, escritura solo por Server Actions (admin client o token validado)
alter table shifts enable row level security;

create policy "shifts_public_read" on shifts
  for select using (true);

-- Las mutaciones (insert / update / delete) las hacen Server Actions con el admin client;
-- no se expone política de escritura a anon/authenticated para evitar bypass del token.
```

> **Nota sobre el `manage_token`:** es un `uuid` generado en la base, no en el cliente.
> La Server Action de edición valida `WHERE id = $id AND manage_token = $token` antes de
> aplicar cualquier cambio. Si no coincide devuelve 403.

### Estados del turno

```
open ──→ full     (el creador lo marca manualmente)
  │        │
  └────────┴──→ closed   (el creador lo cierra o elimina)

[expirado]  = start_time < NOW() - 30min  → filtrado en query, no es un estado en DB
```

Los turnos `full` se muestran al final de la lista, opacados (pueden reabrirse). Los turnos
`closed` no se muestran. Los expirados no se muestran (read-filter) y **se borran
automáticamente** vía `pg_cron` — ver "Auto-cierre y limpieza automática".

---

## Páginas y componentes

### `/turnos` — Lista pública

**Archivo:** `src/app/turnos/page.tsx`

**Comportamiento:**
- Server Component con query a Supabase.
- Filtra: `start_time >= NOW() - INTERVAL '30 minutes'` y `status != 'closed'`.
- Ordena: `start_time ASC` (más próximo arriba). Los `full` van al fondo de la lista
  (ordenar por `CASE WHEN status = 'full' THEN 1 ELSE 0 END ASC, start_time ASC`).
- Revalida cada 60 segundos (`export const revalidate = 60`).

**Filtros (Client Component `ShiftFilters`):**
- Fecha: "Hoy" / "Mañana" / "Esta semana" — default "Hoy". Pasa como query param `?date=`.
- Slots disponibles: "1" / "2" / "3" / "4" — opcional, query param `?slots=`.
- Implementados como chips/toggles, no dropdowns (consistente con la UI existente).

**Tarjeta de turno (`ShiftCard`):**
```
┌─────────────────────────────────────────────────┐
│  CANCHA NOMBRE                    Hoy · 19:30   │
│  Faltan 2 · 5ta categoría                       │
│  "traigan pelotas"                              │
│                                                 │
│  [WhatsApp]        [Instagram]   [Tuyo · Editar]│
└─────────────────────────────────────────────────┘
```
- Badge "Completo" + opacidad 50% si `status = 'full'`.
- Badge "Tuyo" + botón "Editar" si el `id` está en `localStorage['myShiftTokens']`.
- El botón Instagram solo aparece si `instagram` no es null.

**Deep links:**
- WhatsApp: `https://wa.me/549${whatsapp}?text=Hola%20${creator_name}%2C%20vi%20tu%20turno%20en%20Matchpoint%20para%20el%20[fecha]%20en%20[cancha].%20%C2%BFSigue%20disponible%3F`
  - El número se muestra con prefijo `+54 9` en la tarjeta pero el link usa dígitos crudos.
  - El mensaje es pre-llenado sugerido; el usuario puede editarlo en WhatsApp antes de enviar.
- Instagram: `https://instagram.com/${instagram}` (abre perfil; el usuario inicia el DM).

**Header de la página:**
```
Tablero de turnos          [+ Publicar turno]
Encontrá compañeros para tu próximo partido
```

---

### `/turnos/nuevo` — Crear turno

**Archivo:** `src/app/turnos/nuevo/page.tsx` + `src/app/turnos/nuevo/new-shift-form.tsx`

**Campos del formulario con defaults:**

| Campo | Tipo | Default | Requerido |
|-------|------|---------|-----------|
| Cancha / Club | texto libre | — | Sí |
| Fecha | date picker | hoy | Sí |
| Hora | time picker (HH:MM) | próxima hora redonda* | Sí |
| Jugadores que faltan | número 1–4 (segmented control o select) | 2 | Sí |
| Categoría | texto libre | — | No |
| Notas | texto libre (max 140 chars) | — | No |
| Tu nombre | texto | — | Sí |
| WhatsApp | texto numérico | `localStorage['lastWhatsapp']` | Sí |
| Instagram | texto (@handle) | — | No |

> *Próxima hora redonda: si son las 15:20 → default 16:00; si son las 15:50 → default 17:00.
> Se calcula en el Client Component al montar.

**Validación (zod 4):**
```typescript
const shiftSchema = z.object({
  court_name:   z.string().min(2).max(100),
  start_time:   z.string().datetime(),          // ISO combinado de fecha + hora
  slots_needed: z.number().int().min(1).max(4),
  category:     z.string().max(60).optional(),
  notes:        z.string().max(140).optional(),
  creator_name: z.string().min(2).max(60),
  whatsapp:     z.string().regex(/^\d{8,15}$/), // solo dígitos
  instagram:    z.string().max(30).optional(),
})
```

**Server Action `createShift` (`src/app/turnos/actions.ts`):**
1. Valida con zod.
2. Normaliza `whatsapp` (elimina espacios, guiones, `+`, prefijo `54`/`549`).
3. Normaliza `instagram` (elimina `@` si viene con él).
4. Inserta con **admin client** (bypasea RLS de escritura).
5. Retorna `{ id, manage_token }`.
6. El Client Component redirige a `/turnos/${id}/editar?token=${manage_token}` y guarda
   `{ [id]: manage_token }` en `localStorage['myShiftTokens']` + `whatsapp` en
   `localStorage['lastWhatsapp']`.

---

### `/turnos/[id]/editar` — Gestionar turno

**Archivo:** `src/app/turnos/[id]/editar/page.tsx`

**Acceso:**
- Recibe `?token=` como query param.
- Server Component: busca el shift con `WHERE id = $id AND manage_token = $token`.
- Si no existe o no coincide el token → redirige a `/turnos` con mensaje de error.

**UI:**
- Mismo formulario que `/turnos/nuevo`, pre-llenado.
- Botones de acción debajo del formulario:

```
[Guardar cambios]

────────────────────────

[Marcar como completo]   ←→  [Reabrir turno]   (toggle según status actual)
[Cerrar turno]                                  (lo saca de la lista, reversible)
[Eliminar]                                      (borrado permanente, confirmación)
```

**Server Actions en `src/app/turnos/actions.ts`:**

```typescript
updateShift(id, token, data)   // valida token + actualiza campos
setShiftStatus(id, token, status: 'open' | 'full' | 'closed')
deleteShift(id, token)         // DELETE FROM shifts WHERE id = $id AND manage_token = $token
```

Todas validan `manage_token` dentro de la query — si no coincide Supabase no afecta ninguna fila
y la action retorna error.

**Toast tras guardar:** "Turno actualizado." con link "Volver al tablero".

---

## Estructura de archivos

```
src/app/turnos/
├── page.tsx                  # Lista pública (Server Component)
├── layout.tsx                # Layout mínimo (sin OrganizerHeader)
├── actions.ts                # createShift / updateShift / setShiftStatus / deleteShift
├── nuevo/
│   └── page.tsx              # Formulario de creación
├── [id]/
│   └── editar/
│       └── page.tsx          # Formulario de edición / gestión
└── components/
    ├── shift-card.tsx        # Tarjeta de turno (con deep links)
    ├── shift-filters.tsx     # Chips de filtro (Client Component)
    ├── new-shift-form.tsx    # Formulario de creación (Client Component)
    └── edit-shift-form.tsx   # Formulario de edición (Client Component)
```

---

## Navegación — integración con el resto de la app

- **Header público** (el de `/t/[id]` y similares, no el `OrganizerHeader`): agregar link
  "Turnos" que lleve a `/turnos`.
- **Landing (`/`)**: agregar mención de la sección en el bloque "Próximamente" o como feature
  propia si se lanza antes.
- La sección `/turnos` no aparece en el área autenticada del organizer (es una sección de
  jugadores, orthogonal al área de gestión).

---

## Consideraciones de seguridad

- Las mutaciones usan el **admin client** con validación explícita de `manage_token` en la
  query. El token nunca se expone en la lista pública (no forma parte del `SELECT` de la lista).
- Rate limiting: no implementado en esta versión. Si aparece abuso, agregar un middleware
  de rate limit por IP sobre las rutas de creación (o Cloudflare WAF rules).
- Spam: fuera de scope. Mitigación futura: CAPTCHA en el form de creación.
- Números de WhatsApp e Instagram son visibles para cualquiera que vea la lista. El creador
  acepta esta visibilidad al publicar (agregar texto aclaratorio en el formulario).

---

## Auto-cierre y limpieza automática (decidido 2026-07-01)

**Regla de producto:** un turno se considera **cerrado en cuanto pasó su horario** (con la misma
gracia de 30 min que ya usa la lista), y **todos los turnos cerrados se borran automáticamente**.
Así el tablero queda siempre limpio, sin intervención manual.

**Enfoque óptimo: `pg_cron` en Supabase** (no Edge Function, ni Cron Trigger de Cloudflare, ni
cleanup on-read). Por qué:
- Corre **en la base**, independiente del tráfico web: los expirados se van aunque nadie visite
  `/turnos`. Un cleanup on-read no corre si no hay visitas y mete `DELETE`s en el path de lectura.
- **Cero código de app/worker** y cero superficie de auth: es SQL puro agendado.
- Nativo de Supabase (extensión `pg_cron`), sin infra extra.

**Implementación:**
- Migración `0022_shifts_cleanup.sql`: `create extension if not exists pg_cron;` +
  `select cron.schedule('shifts_cleanup', '0 * * * *', $$ ... $$);` (cada hora; el timing exacto
  no es visible al usuario porque la lista ya oculta expirados por read-filter).
- El job borra en **una sola sentencia** todo lo que ya no sirve — expirados **y** cerrados:
  ```sql
  delete from shifts
  where status = 'closed'
     or start_time < now() - interval '30 minutes';
  ```
- **No hace falta un `UPDATE` intermedio a `closed`** para los expirados: la lista ya los oculta
  por el read-filter (`start_time >= now() - interval '30 min'`), así que "expirado" se comporta
  como "cerrado" para el usuario y el job los elimina físicamente. El estado `closed` en DB queda
  solo para el cierre manual del creador (que este mismo job después borra).
- Se **mantiene el read-filter lazy** como belt-and-suspenders: UX instantánea entre corridas del
  cron (un turno recién expirado no se ve aunque el job todavía no haya corrido).

**Si en el futuro se quiere que `closed` sea observable antes de borrarse** (mostrar "cerrado" un
rato, o auditar), se parte en dos sentencias: `UPDATE ... set status='closed'` para los expirados
+ `DELETE ... where status='closed' and <gracia>`.

---

## Pendientes futuros (fuera de scope ahora)

- **Contador de "Me uno":** en vez de marcar manual como "completo", decrementar `slots_needed`
  al clickear el botón de contacto (llegaría a 0 → auto-full).
- **Push notifications:** avisar al creador cuando alguien clickea "Contactar" (requiere Web
  Push / VAPID, ya contemplado como Fase 2 de la PWA).
- **Filtro por zona/barrio:** requeriría un campo estructurado de ubicación, hoy es texto libre.
- **Login de jugador (v4):** al implementarse, los turnos podrían vincularse a un perfil y
  mostrar historial, reducir fricción del formulario y habilitar moderación.
