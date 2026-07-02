# spec-v3-2.md — v3 (parte 2): Branding del organizador + refinamientos estéticos

> **Estado:** ✅ IMPLEMENTADO, mergeado a `master` y **deployado a producción (2026-06-22)**.
> Branch `feature/organizer-branding` (no borrada). Migraciones `0019` y `0020` aplicadas.
> Pendiente: pase visual logueado (subir logo + elegir paleta en `/settings`, ver pública con
> tema/logo, imagen OG real). Branch original: `feature/organizer-branding`.
> Eje: features estéticos para el organizador (marca propia) + mejoras de presentación del
> index + fluidez de navegación. **No toca la lógica de negocio** (torneos, inscripciones,
> zonas, llaves) — es capa de presentación, branding y landing.
>
> Decisiones de producto ya tomadas (no revertir sin discusión):
> - **Imagen de organización → Supabase Storage** (se adelanta Storage respecto del plan
>   original que lo difería; costo despreciable para logos).
> - **Theming → paletas curadas (presets)**, no color picker libre. Preserva el sistema "Court
>   Side": sólo cambia el **acento de marca**; los neutros, el off-white frío, las superficies
>   blancas y la tipografía quedan fijos.
> - **Una sola paleta de marca** aplica a TODO: dashboard del organizador, páginas públicas e
>   imágenes de difusión (OG / historia de Instagram).

---

## 0. Contexto y tensión de diseño a resolver

El sistema visual (`DESIGN.md`) tiene la **Regla de Una Voz**: el azul real `#2D52E8` es el único
color de marca. Dar theming por organizador parece contradecirla. **No la contradice si lo
acotamos bien:** cada organizador elige una *voz* (un acento) de un set curado, y esa voz cumple
exactamente el rol que hoy cumple el azul (botón primario, líder, "en juego", campeón, etc.). La
estructura Court Side —off-white frío, superficies blancas, plano por tono, tipografía expandida,
números mono— **no se toca**. El theming es "cambiar de equipo", no "romper el tablero".

Implicancia técnica: el theming se reduce a **swappear la familia `--volt*`** (y `--ring`,
`--primary`) por CSS variables. Todo el resto de los tokens queda igual.

---

## Feature A — Branding del organizador (post-registro)

El organizador, una vez registrado, configura su **identidad**: logo, dirección/ubicación y
paleta de marca. Esa identidad se ve en su dashboard, en las páginas públicas de sus torneos y
en las imágenes que comparte.

### A.1 Modelo de datos

Migración nueva `supabase/migrations/0019_organizer_branding.sql`:

```sql
alter table organizers
  add column logo_path  text,                              -- path en bucket org-logos (null = sin logo)
  add column address    text,                              -- dirección legible (texto libre)
  add column maps_url    text,                             -- link opcional a Google/Apple Maps
  add column theme_key  text not null default 'royal';     -- clave de paleta curada (ver A.3)

-- Validación blanda del theme_key (defensa; la fuente de verdad es el map en TS).
alter table organizers
  add constraint organizers_theme_key_check
  check (theme_key in ('royal','pista','clay','match','aqua','grafito'));
```

> `logo_path` guarda **el path** (`{organizer_id}/logo.<ext>`), no la URL. La URL pública se
> arma en runtime (`supabase.storage.from('org-logos').getPublicUrl(path)`), así no se hardcodea
> el dominio del proyecto y sobrevive a cambios de entorno.

**Vista pública** — redefinir `public_organizer_view` para exponer el branding (todo es público,
sin PII). Va en la misma migración (delta sobre la de `0009`):

```sql
drop view if exists public_organizer_view;
create view public_organizer_view as
  select o.id, o.establishment_name, o.calendar_slug,
         o.logo_path, o.address, o.maps_url, o.theme_key
  from organizers o;
grant select on public_organizer_view to anon, authenticated;
```

> ⚠️ Recordar el gotcha de `db:apply`: agregar el archivo y correr `npm run db:apply -- 0019`.

### A.2 Supabase Storage — bucket de logos

Es el **primer uso de Storage** del proyecto. Bucket público (los logos se muestran en páginas
públicas e imágenes OG, no hay nada privado).

- **Bucket:** `org-logos`, `public = true`.
- **Convención de path:** `{organizer_id}/logo.<ext>` — un solo logo por organizador; reemplazar
  pisa el archivo (o se borra el viejo si cambia la extensión, para no dejar huérfanos).
- **Policies** sobre `storage.objects` (el organizador sólo toca su carpeta; lectura abierta):

```sql
-- Lectura pública del bucket.
create policy "org_logos_public_read" on storage.objects
  for select using (bucket_id = 'org-logos');

-- Insert/Update/Delete sólo del propio organizador (primer segmento del path = su uid).
create policy "org_logos_owner_write" on storage.objects
  for all to authenticated
  using (bucket_id = 'org-logos'
         and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'org-logos'
              and (storage.foldername(name))[1] = auth.uid()::text);
```

> El bucket + policies se crean por SQL en `0019` (o desde el dashboard si el `db:apply` no aplica
> sobre el schema `storage`; documentar cuál se usó). **Decidir al implementar** y dejar asentado.

- **Validación de upload (cliente + server action):** tipo en `image/png|jpeg|webp|svg+xml`,
  tamaño ≤ ~1 MB. Idealmente downscale en el cliente (canvas) a un lado máximo (ej. 512px) antes
  de subir, para no guardar imágenes enormes. SVG: aceptar pero sanear/forzar `cacheControl`.
- **Reemplazo:** subir con `upsert: true`; si cambia la extensión, borrar el path anterior
  (`logo_path` viejo) tras subir el nuevo.

### A.3 Paletas curadas (presets)

Fuente de verdad: un **map en TS** (`src/lib/branding/themes.ts`); la DB sólo guarda la `theme_key`.
Cada preset define **únicamente** la familia de acento (el resto del tema queda fijo):

```ts
export type ThemeKey = 'royal' | 'pista' | 'clay' | 'match' | 'aqua' | 'grafito'

export type ThemePalette = {
  key: ThemeKey
  label: string            // nombre visible (rioplatense, deportivo)
  volt: string             // acento pleno  → --volt / --primary / --ring
  voltForeground: string   // texto sobre el acento → --volt-foreground
  voltDeep: string         // tono profundo (texto sobre tinte, hover) → --volt-deep / --accent-foreground
  voltTint: string         // relleno suave (chips, avatar) → --volt-tint / --accent
  voltSurface: string      // superficie destacada (fila líder) → --volt-surface
}
```

Set inicial (6 presets — **validar contraste AA al implementar**, sobre todo `voltForeground`
sobre `volt` y `voltDeep` sobre `voltTint`):

| key | label | volt | voltDeep | voltTint | voltSurface | notas |
|---|---|---|---|---|---|---|
| `royal` | Azul Real (default) | `#2D52E8` | `#1E3FAE` | `#DBE3FB` | `#F5F8FF` | el actual; default |
| `pista` | Verde Pista | `#0E9C77` | `#0E6E55` | `#D2F0E6` | `#F1FBF7` | verde cancha |
| `clay` | Naranja Clay | `#E2620E` | `#A8470A` | `#FBE6D5` | `#FFF7F0` | polvo de ladrillo |
| `match` | Rojo Match | `#DC2E3E` | `#A11A28` | `#FBDDDF` | `#FFF5F5` | intenso |
| `aqua` | Cian Aqua | `#0E8FA8` | `#0A6275` | `#D2EEF4` | `#F1FBFD` | fresco |
| `grafito`| Grafito | `#2B3242` | `#0D1020` | `#DDE1EA` | `#F4F5F8` | monocromo elegante |

> Anti-referencia (`PRODUCT.md`): **sin violeta/magenta** (es el template de IA), **sin neón**.
> Todos los acentos son colores "de cancha", saturación controlada. `voltForeground` es `#FFFFFF`
> salvo donde el contraste exija ink (validar; probablemente todos blanco menos casos borde).

### A.4 Aplicación del tema (CSS variables)

El theming = inyectar las variables `--volt*` (+ `--primary`, `--ring`, `--accent`,
`--accent-foreground`) como **estilo inline en el contenedor raíz de la página**, derivadas del
preset. Helper:

```ts
// src/lib/branding/themes.ts
export function themeVars(key: ThemeKey): React.CSSProperties { /* devuelve el style object */ }
```

- **Dashboard / área organizer:** cada página del área ya lee el organizer server-side; pasar
  `themeVars(organizer.theme_key)` al `style` del contenedor `max-w-6xl` (o a un wrapper común).
  Conviene un **layout** del área organizer que centralice esto en vez de repetirlo por página.
- **Páginas públicas** (`/t/[id]/*`, `/o/[slug]`): resolver el organizer dueño y aplicar
  `themeVars(theme_key)` al wrapper de la página. **Esto es el corazón del feature:** la identidad
  del club (color + logo) tiene que verse en las páginas que ve el **jugador** — es lo que le da
  identidad a la organización frente a su comunidad, no sólo en su panel privado.
- **`.glow`:** hoy hardcodea `rgba(45,82,232,...)`. Parametrizar el color del halo para que use el
  acento (exponer un `--glow-rgb` derivado del preset, o aceptar que el glow quede azul fijo como
  detalle de la app — **decisión menor a confirmar**; recomiendo parametrizarlo para coherencia).
- **Default y fallback:** sin `theme_key` o key inválida → `royal` (idéntico al look actual).
  Importante: el preset `royal` debe dar **exactamente** los valores de hoy → cero regresión visual.

### A.5 Imágenes de difusión (OG / historia)

Las rutas OG/story (`/o/[slug]/og/story`, `/t/[tournamentId]/bracket/og/story`,
`src/lib/og/champion-story.tsx`, `src/lib/og/story.tsx`) hoy hardcodean el azul. Parametrizar:

- `buildChampionStory` y `buildStory` reciben el **acento** (volt/deep/tint/surface) además de los
  params actuales.
- La ruta resuelve el `theme_key` del organizer dueño → preset → pasa los colores.
- **Logo en la imagen:** si el organizador tiene `logo_path`, incrustarlo en la historia (fetch de
  la URL pública del CDN de Storage — funciona en Workers; el gotcha era con assets *bundleados*
  vía `import.meta.url`, no con URLs HTTPS). Posición: esquina/encabezado de la pieza. Si no hay
  logo, cae al wordmark "MATCHUP" como hoy.

### A.6 UI — página de configuración

Nueva ruta **`/settings`** (área organizer, protegida): "Perfil de organización". Secciones:

1. **Logo:** preview del logo actual (o avatar de iniciales si no hay), input de archivo con
   drag&drop, validación, botón quitar. Acción `uploadOrganizerLogo` / `removeOrganizerLogo`.
2. **Ubicación:** `address` (textarea corta) + `maps_url` (input URL opcional, validado con zod).
3. **Paleta de marca:** grilla de swatches (una por preset) con **preview en vivo** — al elegir,
   re-tiñe la propia pantalla de settings (aplicando `themeVars` al vuelo) para que el organizador
   vea el efecto antes de guardar. Guarda `theme_key`. Incluye botón **"Volver al default"**
   (resetea a `royal`, el azul real).

- **Acceso:** ítem "Configuración" en el menú del header (desktop: junto al avatar; mobile: en el
  menú colapsable nuevo). Reusar/extender `OrganizerHeader`.
- **Server actions** (`src/app/settings/actions.ts`): `updateOrganizerProfile({address, maps_url,
  theme_key})` y las de logo. Validan con `requireUser()` + RLS (`organizers_update_own` ya existe,
  no hace falta admin client). `revalidatePath` del dashboard y settings.
- **Validación:** zod 4 (`z.url()` para maps_url opcional, `theme_key` enum). RHF para los campos
  de texto; el theme picker y el archivo con `useState` local (regla React Compiler del proyecto).

### A.7 Mostrar el branding

- **Logo del organizador:** en `OrganizerHeader` el logo **convive con el nombre** del
  establecimiento (logo + nombre, no lo reemplaza). Sin logo, cae al avatar de iniciales. Igual en
  el header de las páginas públicas de torneo y del calendario público.
- **Dirección + maps:** en la página pública del torneo (`/t/[id]`) y en el calendario público
  (`/o/[slug]`), como bloque "Dónde" con el `address` y, si hay `maps_url`, un link "Cómo llegar".
  Ayuda real al jugador (contexto: cel, en el club).

---

## Feature B — Landing: más contenido promocional + "Próximamente"

`src/app/page.tsx`. Hoy promociona sólo lo que ya hace (3 cards). Sumar autopromoción y un
roadmap honesto. Estructura nueva (de arriba a abajo):

1. **Hero** (existente) — copy + CTAs. El visual de la derecha pasa a ser el **carousel** (Feature C).
2. **"Lo que hacés hoy"** — la tira de features actual, expandida/mejorada: inscripciones,
   zonas y partidos, llaves y campeón, calendario público + QR, compartir (WhatsApp/IG). Más
   contenido y mejor jerarquía que las 3 cards de hoy, manteniendo el estilo plano-por-tono.
3. **"Próximamente"** — sección de roadmap, claramente marcada como futuro (chips "Próximamente"
   en tono neutro, sin prometer fechas). Teasers honestos:
   - **Perfiles de jugador, stats y rankings** (v4) — "Cada jugador con su historial, sus números
     y su ranking. Lo que cargás hoy ya alimenta ese perfil."
   - **Reserva de turnos de cancha** (v5) — "Tus canchas, con disponibilidad y reservas, en el
     mismo lugar."
   - **Transmisión en vivo** (aspiracional) — "Transmití los partidos de tu club desde la app."
4. **Banda de cierre / CTA** — repetir "Crear cuenta" con un cierre de marca.

- **Voz:** rioplatense, confiada, sin jerga (`PRODUCT.md`). "Próximamente" debe leerse como
  visión creíble, no como humo. Sin fechas.
- **Estilo:** respeta `DESIGN.md` — plano por tono + borde 1px, acento con moderación, titulares
  Archivo expandida, nada de gradiente violeta/IA. Los chips "Próximamente" usan neutro
  (`--secondary`/`--muted-foreground`), no el acento (reservado para lo que ya existe / CTAs).
- **El index no tiene organizer** → usa el tema `royal` (default). El theming por organizador no
  aplica a la landing.

---

## Feature C — Carousel animado en el hero (auto-play)

Reemplaza el `BracketShowcase` único por un **carousel auto-reproducido** que muestra varias
caras del producto. Componente cliente nuevo: `src/components/landing/showcase-carousel.tsx`.

**Slides (mock estáticos, ilustrativos — no datos reales):**
1. **Llaves · Final** — el `BracketShowcase` actual (migrar tal cual a un slide).
2. **Zona · Posiciones** — mini scoreboard de standings (`# / Pareja / PJ / DG / PTS`, líder con
   borde-izq azul), el componente firma del sistema.
3. **Calendario público · QR** — card con QR de ejemplo + "Pegalo en el club".
4. **Campeón · Historia** — preview de la pieza de campeón compartible.
5. *(opcional)* **Inscripción** — card de "anotá tu pareja".

**Comportamiento:**
- Auto-avanza cada ~4.5s; transición suave (fade o slide-x, ~500ms).
- **Dots** clickeables abajo (botones, no decorativos) + estado activo.
- **Pausa** en hover y en focus-within; reanuda al salir.
- `setInterval` con cleanup en `useEffect`; sin librería nueva (CSS + estado).
- **`prefers-reduced-motion`:** sin auto-avance ni transición animada — se muestran los dots y el
  usuario cambia manual (o se deja el primer slide fijo). No-negociable (`PRODUCT.md`).
- **Accesibilidad:** `role="group"` / `aria-roledescription="carousel"`, cada slide con
  `aria-label`, control de pausa accesible, dots con `aria-label` y `aria-current`.
- **Mobile:** una sola card visible, swipe opcional (nice-to-have; el auto-play + dots alcanza).

> Mantener el peso bajo: los slides son markup estático tematizado, no imágenes pesadas. El bundle
> de Cloudflare no debe crecer de forma notable.

---

## Feature D — Transiciones entre páginas

Objetivo: sensación de fluidez al navegar, sutil, sin pelear con la velocidad que valora el
organizador.

**Enfoque recomendado: `template.tsx` con CSS** (estable, cero dependencias, ya hay patrón de
keyframes `reveal` en `globals.css`).

- `src/app/template.tsx`: a diferencia de `layout.tsx`, **se re-monta en cada navegación**.
  Envuelve `children` en un wrapper con una animación de entrada sutil (fade + `translateY(6px)`,
  ~220–280ms, `cubic-bezier(0.16,1,0.3,1)`). Reusar/extender la utilidad `.reveal`.
- **`prefers-reduced-motion`:** la media query que ya existe para `.reveal` anula la animación.
- **Sutileza:** corto y suave; el área organizer prioriza eficiencia, así que nada de transiciones
  largas o con desplazamientos grandes. Apuntar a "se asienta", no "se desliza media pantalla".

**Alternativa (no recomendada ahora):** View Transitions API de Next 16
(`experimental.viewTransition` + `unstable_ViewTransition`). Da cross-fades más ricos pero es
**experimental** y su interacción con OpenNext/Cloudflare no está validada en este proyecto. Dejar
anotado como posible upgrade futuro una vez que estabilice.

> Verificar que `template.tsx` no rompa el `loading.tsx` existente ni el flujo de `glow`/`z-[2]`.

---

## Feature E — Doc funcional: asentar rankings en v4

`functional-doc.md` **ya** menciona rankings en "Versión 4 — Perfiles de jugador, stats y
rankings" (perfil + stats + rankings). Esta tanda:
- **Refuerza** la redacción para dejar los **rankings** explícitos como objetivo central de v4
  (no sólo un bullet entre otros).
- **Agrega** una sección funcional "Versión 3 (parte 2)" describiendo, a nivel producto, el
  branding del organizador y las mejoras de presentación (el detalle de implementación vive acá).

*(La edición de `functional-doc.md` se hace en esta misma branch, ver más abajo.)*

---

## Orden de implementación sugerido (fases)

1. **Datos + presets:** migración `0019` (columnas + vista) · bucket `org-logos` + policies ·
   `src/lib/branding/themes.ts` (presets + `themeVars`). Verificar `royal` == look actual.
2. **Settings + tema en dashboard:** ruta `/settings` (logo upload, ubicación, theme picker con
   preview) · actions · aplicar `themeVars` al área organizer (layout) · logo en `OrganizerHeader`.
3. **Branding en público + OG:** aplicar tema a páginas públicas · mostrar logo + dirección/maps ·
   parametrizar acento y logo en las imágenes OG/historia.
4. **Landing:** más contenido promocional + sección "Próximamente".
5. **Carousel** del hero (auto-play + reduced-motion).
6. **Transiciones** de página (`template.tsx`).

Cada fase: `build` + `lint` OK antes de seguir. Las fases 4–6 son independientes del branding y se
pueden reordenar.

---

## Riesgos y decisiones a confirmar al implementar

- **Storage adelantado:** decisión consciente; actualizar `CLAUDE.md` y `functional-doc.md` (tabla
  de stack) para reflejar que Storage entra acá (logos), no en la última versión.
- **Una Voz vs acento custom:** sólo swappea `--volt*`; estructura Court Side intacta. Validar que
  ningún preset rompa contraste (AA en texto). Mantener verde/ámbar/rojo **semánticos** aunque el
  acento sea verde/rojo (un torneo "aceptado" sigue verde, etc.) → posible colisión visual si el
  acento es `pista` (verde) o `match` (rojo): **revisar** que estado y acento se distingan (el
  estado usa tinte+texto profundo; el acento, pleno) o documentar la convención.
- **Glow parametrizable:** confirmar si el halo sigue el acento o queda azul fijo (recomiendo
  seguir el acento).
- **`.glow`/`z-[2]` + `template.tsx`:** verificar que la capa fija de fondo y el `relative z-[2]`
  de cada página sigan funcionando con el wrapper de transición.
- **Huérfanos en Storage:** manejar borrado del logo viejo al reemplazar con otra extensión.
- **Bucket por SQL:** RESUELTO — `apply-migrations.mjs` corre SQL vía Management API como
  `postgres`, así que crear el bucket (`insert into storage.buckets`) y las policies sobre
  `storage.objects` por SQL funciona. Va todo en `0019`.
- **Decisiones confirmadas (2026-06-22):** se mantienen los 6 presets (verde/rojo incluidos),
  distinguiendo acento (pleno) de estado (tinte+texto); el theming aplica a páginas públicas por
  organización (identidad frente al jugador); el logo convive con el nombre; hay botón "volver al
  default"; el glow sigue el acento.
- **Egress de Storage:** logos chicos + CDN; sin riesgo con el volumen esperado (verificar plan).
