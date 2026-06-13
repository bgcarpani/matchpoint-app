# Matchpoint App — Spec v2

## Alcance
Este documento cubre la **versión 2** completa y es **autosuficiente** para arrancar la
implementación en una sesión nueva. Incluye:

1. **Calendario público del organizador** (link estático + QR).
2. **Anti-duplicado de inscripción por email** dentro de un torneo.
3. **Resultados / scoring de partidos** (configurable por torneo).
4. **Formatos de partido por zona + standings/posiciones de zona.**
5. **Fase de llaves / bracket** (clasificación configurable + byes).
6. **Seguimiento en vivo** (Supabase Realtime) de zonas y bracket.

El "qué/por qué" cross-versión vive en `functional-doc.md` → "Versión 2". Las convenciones de
implementación (Next 16, Supabase, RLS, vistas seguras + RPCs, validación/UI) son las mismas de v1
— ver `CLAUDE.md` y `spec.md`. Acá se documentan solo los **deltas** sobre v1.

> Decisiones de producto cerradas al inicio de v2 (ver cada feature): scoring **configurable** con
> default a **games (1 set a 6/7)** y excepción **best of 3 sets**; standings por **puntos → dif. de
> games** en round-robin y por **progresión** en ganador-vs-perdedor; **clasificados por zona
> configurables**; **byes automáticos** a los mejores sembrados con opción de armado manual.

### Orden sugerido de slices
1. Calendario público + QR (independiente, bajo riesgo) — Feature 1.
2. Anti-duplicado por email (delta chico al RPC existente) — Feature 2.
3. Resultados/scoring de partidos de zona — Feature 3.
4. Standings de zona + formatos de partido (round-robin / ganador-vs-perdedor / manual) — Feature 4.
5. Bracket (clasificación + byes + progresión) — Feature 5.
6. Realtime sobre zonas/standings/bracket — Feature 6.

---

## Modelo de datos — deltas v2

> Las tablas base son las de v1 (`spec.md`). Acá se listan **solo** los campos nuevos o que cambian
> de nulabilidad. `ZonePair.position`/`points` y `Match.team1_score`/`team2_score`/`status` ya
> estaban **reservados** en v1 y se **activan** en v2.

### Tournament (delta)
```
scoring_mode          enum    'games' | 'best_of_3_sets'   default 'games'
games_per_set         int     default 6   — games por set (6 o 7); aplica a ambos modos
qualifiers_per_zone   int     default 2   — cuántas parejas clasifican por zona al bracket
live_tracking_enabled boolean default true — seguimiento en vivo (Realtime) on/off por torneo
```
> `scoring_mode`/`games_per_set`/`qualifiers_per_zone` se fijan al crear/editar el torneo y quedan
> bloqueados una vez `in_progress`.

### Organizer (delta — Feature 1)
```
calendar_slug   string   único, NOT NULL — slug corto no adivinable del calendario público
```

### Zone (delta)
```
match_format     enum     'round_robin' | 'winner_vs_loser' | 'manual'  default 'round_robin'
standings_frozen boolean  default false — true al cerrar posiciones (habilita el sorteo de bracket)
```

### ZonePair (se activa en v2)
```
position  int   — posición final en la zona (1..N), se congela al cerrar standings
points    int   default 0 — puntos acumulados (victoria = 2, derrota = 0; sin empates en pádel)
```
> Métricas de desempate (jugados, ganados, games a favor/en contra) se **computan** en vivo desde
> `matches` vía `zone_standings_view`; al cerrar la zona, `position`/`points` se **congelan** en
> `ZonePair` para sembrar el bracket de forma determinística.

### Match (deltas v2)
```
team1_pair_id   uuid   → pasa a NULLABLE (slots TBD del bracket / byes)
team2_pair_id   uuid   → pasa a NULLABLE
score_detail    jsonb  nullable — desglose por set en 'best_of_3_sets' (ej. [[6,4],[3,6],[7,5]])
winner_pair_id  uuid   nullable FK → Pair — se setea al finalizar el partido
phase           enum   'zone' | 'bracket'  default 'zone'
bracket_round   int    nullable — ronda del bracket (1 = primera; sube hacia la final)
bracket_slot    int    nullable — posición del partido dentro de la ronda
next_match_id   uuid   nullable FK → Match — a qué partido avanza el ganador
next_slot       enum   'team1' | 'team2'  nullable — qué lado del próximo partido llena el ganador
```
> En **modo games**: `team1_score`/`team2_score` = games del set; `score_detail` queda null.
> En **best_of_3_sets**: `team1_score`/`team2_score` = **sets ganados** (ej. 2–1) y `score_detail`
> guarda el detalle por set. `phase='bracket'` ⇔ `zone_id IS NULL` (se mantiene derivable pero
> explícito para simplificar queries).

---

## Feature 1 — Calendario público del organizador (link estático + QR)

### Objetivo
Una URL estática por establecimiento que siempre muestra los torneos vigentes, pensada para generar
un **QR imprimible** y pegarlo en la pared. Quien lo escanea ve, sin login, los torneos activos del
momento y entra a inscribirse en cada uno. La URL es estable; el contenido cambia solo.

### "Torneo activo / vigente"
`status` ∈ `{ published, registration_open, registration_closed, in_progress }`. Se excluyen `draft`
y `finished`. Orden: `tournament_date` ascendente.

### Reglas de negocio
- `calendar_slug`: token corto no adivinable (ej. 8 chars base32 sin caracteres ambiguos), **no
  derivado** del nombre ni del UUID. Generado **una vez** al crear el organizer e **inmutable** (el QR
  impreso no se debe romper). Migración: columna + **backfill** a organizers existentes + `UNIQUE`
  `NOT NULL`. Colisión → reintentar generación.
- Slug **válido** siempre resuelve la página, incluso con cero torneos activos → empty state
  ("No hay torneos activos en este momento."). **Nunca 404** para un slug existente.
- Slug **inexistente** → 404.
- Sin PII en la superficie pública.

### Superficie pública (vistas seguras + RLS)
- **`public_organizer_view` (delta):** exponer `calendar_slug` (+ `establishment_name` ya existente)
  para resolver el encabezado por slug aunque no haya torneos activos.
- **`public_calendar_tournament_view` (nueva):** columnas seguras de torneos (`id`, `organizer_id`,
  `name`, `category_type`, `category_value`, `gender`, `tournament_date`, `status`) filtrada a los
  estados activos. `GRANT SELECT` a `anon`.

> Dos lecturas (organizer por slug → torneos por `organizer_id`) en vez de un join único, para que un
> slug sin torneos activos resuelva el encabezado en vez de devolver cero filas.

### QR
Generación **client-side** (nueva dependencia, ej. `qrcode.react`, SVG descargable). Codifica la URL
absoluta `https://<host>/o/[slug]`.

### Rutas
| Ruta | Área | Descripción |
|---|---|---|
| `/o/[slug]` | Pública | Encabezado del establecimiento + lista de torneos activos; cada uno enlaza a `/t/[id]`. |
| `/dashboard` (delta) | Organizer | Panel "Calendario público": URL copiable + "Abrir calendario" + QR descargable. |

### Acceso a datos
| Operación | Implementación |
|---|---|
| Resolver organizer por slug | `public_organizer_view` por `calendar_slug` (anon) — `src/lib/public/calendar.ts` |
| Listar torneos activos | `public_calendar_tournament_view` por `organizer_id` (anon) — `src/lib/public/calendar.ts` |
| URL + QR del organizer | componente client en `/dashboard` |

### Componentes
- `PublicCalendar` (público) · `CalendarSharePanel` (organizer).

### Criterios de aceptación
- [ ] Cada organizer tiene un `calendar_slug` único, corto, no adivinable e inmutable; backfill OK.
- [ ] `/o/[slug]` muestra establecimiento + torneos activos ordenados por fecha; `draft`/`finished` no aparecen.
- [ ] Slug válido sin torneos activos → encabezado + empty state (no 404); slug inexistente → 404.
- [ ] Cada torneo enlaza a `/t/[id]`; sin PII expuesta.
- [ ] El dashboard muestra la URL copiable y un QR descargable que apunta a `/o/[slug]`.

---

## Feature 2 — Anti-duplicado de inscripción por email

### Regla de negocio
Al enviar una nueva solicitud a un torneo, **se rechaza** si el email de **cualquiera de los dos
jugadores** coincide con el de algún jugador que ya integra una pareja de **ese mismo torneo** con
`status` ∈ `{ pending, accepted }`.
- Comparación **case-insensitive** + `trim` (`lower(trim(email))`).
- `rejected` **no bloquea** (puede re-inscribirse). Teléfono **no** se chequea.
- Jugador **sin email** (solo teléfono) no es bloqueado. Alcance **por torneo**.
- Client-side: los dos emails de la **misma** solicitud no pueden ser iguales entre sí.

### Dónde se aplica
- **Autoritativo en el RPC `register_pair`** (SECURITY DEFINER, atómico): antes de insertar, chequea
  colisión contra parejas `pending`/`accepted` del torneo (join `pairs → players` por `status`) y
  aborta con error específico `duplicate_email` → evita carrera entre envíos simultáneos.
- **UI**: `PairRegistrationForm` mapea `duplicate_email` a un mensaje claro.

> **Por qué no un `UNIQUE` en la base:** `Player` es global (no scopeado por torneo); la unicidad
> pedida ("email vigente por torneo") depende del join y del `status`, no expresable como índice
> único simple. Vive en la lógica del RPC.

### Acceso a datos
| Operación | Implementación |
|---|---|
| Inscripción con chequeo | RPC `register_pair` (delta) — `src/app/t/[tournamentId]/actions.ts` |
| Mensaje de error | `PairRegistrationForm` (delta) |

### Criterios de aceptación
- [ ] Email ya presente en pareja `pending`/`accepted` del mismo torneo → rechazo con mensaje claro.
- [ ] El chequeo cubre **ambos** emails de la nueva pareja.
- [ ] Una pareja `rejected` puede re-inscribirse con el mismo email.
- [ ] El mismo email puede inscribirse en otro torneo.
- [ ] Jugador solo con teléfono no es bloqueado.
- [ ] Dos envíos simultáneos con el mismo email no pasan ambos (atómico en `register_pair`).
- [ ] El formulario no permite el mismo email para los dos jugadores de la pareja.

---

## Feature 3 — Resultados / scoring de partidos

### Configuración de scoring (por torneo)
- **`games` (default):** 1 set; `team1_score`/`team2_score` = games. `games_per_set` define el largo
  del set (6 o 7). Ganador = más games; el sistema valida que el resultado cargado tenga un ganador
  (no empate).
- **`best_of_3_sets`:** se ganan al ganar 2 sets; `score_detail` guarda el detalle por set y
  `team1_score`/`team2_score` = sets ganados (2–1 / 2–0). Ganador = quien gana 2 sets.
- `scoring_mode` y `games_per_set` se fijan al crear/editar el torneo y se **bloquean** en `in_progress`.

### Reglas de negocio
- Solo el organizer dueño registra resultados; solo con torneo `in_progress`.
- Al registrar un resultado: `status='finished'`, `winner_pair_id` seteado, recálculo de standings de
  la zona (y, en winner-vs-loser, habilita generar la ronda siguiente; en bracket, avanza al ganador).
- Un resultado puede **corregirse** mientras el torneo siga `in_progress` y la fase no esté congelada
  (zona no `standings_frozen`; bracket no publicado más allá del avance). Corregir recalcula aguas abajo.
- **Puntos** (zona): victoria = 2, derrota = 0 (sin empates en pádel).

### Acceso a datos
| Operación | Implementación |
|---|---|
| Registrar/corregir resultado | server action `record_match_result` (`requireUser()` + RLS) — `src/app/tournaments/[id]/zones/actions.ts` (zona) y `.../bracket/actions.ts` (bracket) |

### Componentes
- `MatchResultForm` — carga de games o de sets según `scoring_mode`.

### Criterios de aceptación
- [ ] El organizer elige scoring (`games` default / `best_of_3_sets`) y `games_per_set` al crear el torneo; bloqueado en `in_progress`.
- [ ] Cargar un resultado setea `status='finished'`, `winner_pair_id` y recalcula standings.
- [ ] Modo `games` rechaza resultados empatados; `best_of_3_sets` valida 2 sets para ganar.
- [ ] Corregir un resultado recalcula aguas abajo mientras la fase no esté congelada.

---

## Feature 4 — Formatos de partido por zona + standings

### Formato de partidos (elección al generar, por zona)
- **`round_robin` (default):** N·(N−1)/2 partidos, todas contra todas — comportamiento de v1.
- **`winner_vs_loser`** (zona de 4 → 4 partidos): Ronda 1 = dos partidos. Ronda 2 = **ganador-vs-
  ganador** (define 1°/2°) y **perdedor-vs-perdedor** (define 3°/4°). La ronda 2 se genera recién al
  cargar los resultados de ronda 1 (depende de resultados → por eso vive en v2).
- **`manual`:** el organizador agrega/quita/edita partidos; al cerrar, asigna posiciones a mano.

### Standings (posiciones de zona)
- **round_robin:** orden por **puntos desc → diferencia de games** (`games_for − games_against`) desc.
  Si persiste el empate → **head-to-head** (resultado directo); si aún persiste → lo resuelve el
  organizador manualmente. Vista en vivo `zone_standings_view` computada desde `matches`.
- **winner_vs_loser:** las posiciones salen de la **progresión**, no de puntos (ganador del cruce de
  ganadores = 1°, su rival = 2°; ganador del cruce de perdedores = 3°, su rival = 4°).
- **manual:** el organizador fija las posiciones.
- **Cerrar standings** (`standings_frozen=true`) congela `position`/`points` en `ZonePair` y habilita
  el sorteo de bracket. Requiere **todos** los partidos de la zona en `finished`.

### Acceso a datos
| Operación | Implementación |
|---|---|
| Generar partidos con formato elegido | RPC `generate_zone_matches(zone_id, format)` (delta de v1) |
| Generar ronda 2 (winner_vs_loser) | RPC `generate_next_zone_round(zone_id)` (depende de resultados de ronda 1) |
| Standings en vivo | vista `zone_standings_view` (computa jugados/ganados/games desde `matches`) |
| Cerrar/congelar standings | server action `freeze_zone_standings(zone_id)` |

### Componentes
- `MatchList` (delta) — selector de formato al generar · `ZoneStandings` — tabla de posiciones en vivo.

### Criterios de aceptación
- [ ] Al generar los partidos de una zona, el organizador elige formato (round-robin / ganador-vs-perdedor / manual).
- [ ] En winner-vs-loser, la ronda 2 se genera correctamente a partir de los resultados de ronda 1.
- [ ] En round-robin, las posiciones ordenan por puntos → dif. de games → head-to-head → manual.
- [ ] Cerrar standings exige todos los partidos finished y congela `position`/`points`.
- [ ] Las posiciones se muestran en vivo en el área organizer y (publicadas) en la pública.

---

## Feature 5 — Fase de llaves / bracket

### Reglas de negocio
- **Clasificación configurable:** `qualifiers_per_zone` (default 2; puede ser 3, etc.) define cuántas
  parejas avanzan por zona. Requiere que **todas** las zonas tengan `standings_frozen=true`.
- **Siembra:** se toman las primeras `qualifiers_per_zone` de cada zona y se siembran con **cruce
  estándar** (1° de una zona vs último clasificado de otra; evitando que parejas de la misma zona se
  crucen en primera ronda cuando es posible).
- **Byes:** si la cantidad de clasificados **no es potencia de 2**, el sistema asigna **byes
  automáticos a los mejores sembrados** (pasan directo a la ronda siguiente) hasta completar. El
  organizador puede **editar cruces/byes a mano** antes de publicar (modo manual override).
- **Partidos de bracket:** `Match` con `zone_id=NULL`, `phase='bracket'`, `bracket_round`/
  `bracket_slot`, `next_match_id`/`next_slot`. `team1_pair_id`/`team2_pair_id` nullable (slots TBD).
- **Progresión:** al finalizar un partido de bracket, `winner_pair_id` se coloca en `next_match_id`
  en el `next_slot`. Completar la final → pareja campeona.
- Mismo `scoring_mode` del torneo para los partidos de bracket.
- **Visibilidad:** bracket oculto hasta publicar (igual que zonas). Público en `/t/[id]/bracket`.

### Acceso a datos
| Operación | Implementación |
|---|---|
| Generar bracket (siembra + byes) | RPC `generate_bracket(tournament_id)` (SECURITY DEFINER) |
| Editar cruces/byes (override manual) | server actions sobre `matches` de `phase='bracket'` (RLS) |
| Publicar bracket | update con RLS |
| Registrar resultado + avanzar ganador | server action `record_match_result` (rama bracket) |
| Bracket público | vista `public_bracket_view` (parejas vía `public_pair_view`, sin PII) |

### Componentes
- `BracketBoard` (organizer, editable antes de publicar) · `PublicBracket` (público).

### Criterios de aceptación
- [ ] El bracket solo se genera con todas las zonas `standings_frozen`.
- [ ] `qualifiers_per_zone` controla cuántas clasifican por zona; la siembra evita cruces de misma zona en R1 cuando es posible.
- [ ] Clasificados no potencia de 2 → byes automáticos a los mejores sembrados; editable a mano.
- [ ] Cargar un resultado de bracket avanza al ganador al `next_match`/`next_slot`; la final define campeón.
- [ ] El bracket permanece oculto hasta publicarse; publicado es visible en `/t/[id]/bracket` sin PII.

---

## Feature 6 — Seguimiento en vivo (Realtime)

### Reglas de negocio
- La vista pública de zonas/standings/bracket se suscribe vía **Supabase Realtime** a cambios en
  `matches` → actualización en vivo de resultados, posiciones y avance del bracket.
- **Opt-in por torneo** vía `live_tracking_enabled` (default true). Si está off, la vista pública se
  refresca solo en navegación/recarga.
- Realtime solo sobre datos ya públicos (zonas/bracket publicados; vistas seguras) — sin PII.

### Acceso a datos
| Operación | Implementación |
|---|---|
| Suscripción a resultados | canal Realtime sobre `matches` filtrado por torneo publicado — `src/lib/public/realtime.ts` |

### Criterios de aceptación
- [ ] Con `live_tracking_enabled=true`, un resultado cargado por el organizer se refleja en la vista pública sin recargar.
- [ ] Con `live_tracking_enabled=false`, la vista pública no usa Realtime.
- [ ] Realtime no expone PII ni datos de fases no publicadas.

---

## Rutas — resumen v2

### Organizer (autenticada)
| Ruta | Delta/Nueva | Descripción |
|---|---|---|
| `/dashboard` | delta | Panel calendario público + QR |
| `/tournaments/[id]/zones` | delta | Registrar resultados, standings en vivo, generar ronda 2, cerrar standings |
| `/tournaments/[id]/bracket` | nueva | Generar/editar/publicar bracket, registrar resultados |

### Pública (sin login)
| Ruta | Delta/Nueva | Descripción |
|---|---|---|
| `/o/[slug]` | nueva | Calendario público del organizador |
| `/t/[id]/zones` | delta | Standings + resultados, Realtime |
| `/t/[id]/bracket` | nueva | Bracket público, Realtime |

---

## Resumen de deltas técnicos v2
- **Migraciones SQL** (`supabase/migrations/00NN_*.sql`, una por slice):
  - `organizer.calendar_slug` (UNIQUE NOT NULL) + backfill; `public_organizer_view` += `calendar_slug`;
    nueva `public_calendar_tournament_view` (grant anon).
  - `register_pair` (delta): chequeo anti-duplicado por email.
  - `tournament`: `scoring_mode`, `games_per_set`, `qualifiers_per_zone`, `live_tracking_enabled`.
  - `zone`: `match_format`, `standings_frozen`.
  - `match`: `team1_pair_id`/`team2_pair_id` → nullable, `score_detail`, `winner_pair_id`, `phase`,
    `bracket_round`, `bracket_slot`, `next_match_id`, `next_slot`.
  - RPCs/vistas nuevas: `generate_zone_matches` (con formato), `generate_next_zone_round`,
    `generate_bracket`, `zone_standings_view`, `public_bracket_view`.
- **Dependencias nuevas:** QR client-side (ej. `qrcode.react`).
- **Realtime:** activar Supabase Realtime sobre `matches` (canal público por torneo).
- **Sin cambios** en el ciclo de vida del torneo respecto de v1.
