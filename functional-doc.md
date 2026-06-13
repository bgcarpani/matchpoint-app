# Matchpoint App — Documento Funcional

## Visión del producto
Plataforma para la comunidad de padel orientada tanto a **organizadores** como a **jugadores**. El objetivo a largo plazo es que cada jugador tenga un perfil propio con su historial, stats y rankings. Las primeras versiones priorizan la gestión de torneos para organizadores como base sobre la cual construir la experiencia del jugador.

## Entidades principales

**Organizer (Organizador)**
Dueño de establecimiento de canchas. Tiene login en el sistema. Gestiona sus canchas, crea torneos y administra inscripciones.

**Court (Cancha)**
Pertenece a un Organizer. Tiene nombre (ej. "Cancha 1") y tipo (al aire libre / techada). Cada organizador posee distinta cantidad de canchas. Se asignan a partidos dentro de un torneo. El modelo de Court está diseñado desde v1 para soportar la extensión de disponibilidad/horarios de v5 sin cambios estructurales.

**Pair (Pareja)**
Unidad de inscripción y participación en el torneo. Dos jugadores forman una pareja fija que compite junta desde la fase de grupos hasta el final. La inscripción siempre se realiza como pareja.

**Player (Jugador)**
Entidad central de la plataforma. En el MVP no tiene login por decisión de alcance, no por falta de relevancia. Siempre pertenece a una pareja dentro de un torneo. El modelo se diseña desde v1 para que en una versión futura cada jugador tenga perfil propio con historial, stats y rankings, vinculado sin migración costosa.
- Datos a guardar: nombre completo, teléfono o email, DNI o identificador único (evita duplicados y es la base del perfil futuro)

---

## Versión 1 — Auto gestión de torneos (MVP)

### Ciclo de vida del torneo
```
Borrador → Publicado → Inscripción abierta → Inscripción cerrada → En curso → Finalizado
```

### Organizer
- Registro y login
- Crear torneo:
  - Nombre y fecha
  - Categoría mediante selector estructurado:
    - Tipo: Individual (1ra a 8va) o Suma (número libre, ej. 10, 12, 14)
    - Género: Masculino, Femenino, Mixto
  - Cupos de solicitud (lista de espera) y cupos de torneo
  - Apertura de inscripción: horario automático o activación manual
  - Canchas del establecimiento asignadas al torneo
- Gestionar inscripciones:
  - Recibe solicitudes de pareja hasta llenar cupos de solicitud
  - Acepta o rechaza solicitudes hasta llenar cupos de torneo (cupos en términos de parejas)
  - Puede remover parejas en cualquier momento
- Gestionar zonas:
  - El sistema genera zonas al azar
  - El organizador puede modificarlas antes de publicarlas
  - Permanecen ocultas hasta que el organizador elige mostrarlas
- Asignar canchas a los partidos generados por las zonas

### Player / Pair (sin login en MVP)
- Un jugador completa el formulario de inscripción con los datos de ambos integrantes de la pareja
- Al enviar, se genera un link único para que la pareja consulte el estado de su solicitud
- Puede consultar estado de inscripción (pendiente / aceptada / rechazada) mediante ese link
- Ve zonas y partidos una vez publicados por el organizador
- Todos los datos guardados en esta versión quedan disponibles para vincular al perfil de jugador en v4

### Nota sobre versiones
Las versiones siguientes se lanzan en base a la necesidad de los organizadores y la comunidad, no a un roadmap fijo.

---

## Versión 2 — Armado de llaves y seguimiento (Formato Americano + Llaves)

### Fase de zonas — Americano con parejas fijas
- Las parejas de cada zona juegan entre sí en formato round-robin (todas contra todas)
- Las parejas son fijas durante todo el torneo
- Se acumulan puntos por pareja en cada partido (victoria = 2, derrota = 0)
- Scoring **configurable por torneo**: por defecto a games (1 set a 6/7) — el caso más común — con la
  excepción de best of 3 sets. Detalle en `spec-v2.md` → Feature 3.
- Al finalizar la fase, la posición de cada pareja dentro de la zona define quién clasifica y en qué lugar entra al bracket

#### Formato de partidos de zona — elección del organizador
En v1 los partidos de zona se generan siempre en round-robin. En v2, al generar los partidos
de cada zona, el organizador elige el formato (resuelve el caso real de que no siempre se juega
todos-contra-todos):
- **Round-robin** (todos contra todos): N·(N−1)/2 partidos por zona — el comportamiento de v1.
- **Ganador vs perdedor** (americano / progresivo): menos partidos por zona (ej. 4 partidos, 2 por
  equipo en una zona de 4). La segunda ronda empareja ganadores con ganadores y perdedores con
  perdedores. **Depende de los resultados** de la ronda previa, por eso vive en v2 (junto al scoring).
- **Manual**: el organizador arma los partidos a mano (agregar / quitar / editar parejas y cancha).

### Fase de llaves — Eliminación directa
- Las parejas clasificadas se ubican en el bracket según su posición en la zona
- Partidos de eliminación directa entre parejas hasta la pareja campeona
- Resultados registrados en cada instancia del bracket

### Consideraciones
- El seguimiento (visualización de bracket y posiciones en tiempo real) es opcional por torneo
- El organizador puede preferir gestión manual en su cancha
- Requiere Supabase Realtime para actualizaciones en vivo

### Refinamientos adicionales v2 (independientes del motor de resultados)
- **Calendario público del organizador**: cada organizador tiene una URL estática por establecimiento
  (slug corto no adivinable, ej. `/o/x7k2qp`) pensada para generar un **QR imprimible** y pegarlo en la
  pared. Quien lo escanea ve, sin login, los torneos vigentes del momento (publicados y no finalizados)
  y entra a inscribirse en cada uno. La URL es estable; el contenido cambia solo.
- **Anti-duplicado de inscripción por email**: no se puede enviar una nueva solicitud a un torneo si
  el email de alguno de los dos jugadores ya tiene una solicitud **pendiente o aceptada** en ese
  mismo torneo. Las rechazadas no bloquean (pueden re-inscribirse).

> Detalle de implementación de ambos en `spec-v2.md`.

---

## Versión 3 — Transmisión en vivo + Notificaciones

### Transmisión
- Establecimientos con capacidad de streaming transmiten sus partidos por la app
- Versión aspiracional con infraestructura pesada (CDN, encoding) — no condiciona el diseño de v1 y v2

### Notificaciones
- Al jugador: aviso cuando su inscripción es aceptada o rechazada
- Al jugador: aviso cuando las zonas son publicadas
- Canal a definir: email y/o WhatsApp

---

## Versión 4 — Perfiles de jugador, stats y rankings
Esta versión marca el punto donde el jugador se convierte en usuario pleno de la plataforma.
- Login de jugadores: registro y autenticación propia
- Perfil de jugador: historial de torneos jugados, resultados, compañeros frecuentes
- Stats individuales: puntos acumulados, partidos ganados/perdidos, rendimiento por categoría
- Rankings: manual hasta implementar sistema de puntos automático; el historial guardado desde v1 alimenta estas estadísticas sin necesidad de migración
- El DNI/identificador guardado desde v1 es el nexo que vincula la actividad previa al nuevo perfil

---

## Versión 5 — Auto gestión de turnos
- Organizadores configuran disponibilidad de sus canchas (horarios, días)
- Jugadores envían solicitud de turno (posible seña, a refinar)
- Organizador acepta o rechaza
- Soporte para turnos fijos con intervalo de repetición configurable
- El modelo de Court diseñado desde v1 soporta esta extensión sin cambios estructurales

---

## Stack tecnológico y herramientas de desarrollo

> Todas las herramientas deben instalarse o activarse únicamente cuando sean necesarias, no antes.

### Tecnologías

| Herramienta | Cuándo agregar |
|---|---|
| Next.js 16 (App Router) + TypeScript | Inicio del proyecto |
| Tailwind CSS + shadcn/ui | Inicio del proyecto |
| Supabase (PostgreSQL + Auth) | Inicio del proyecto (v1) |
| Supabase Realtime | v2 — brackets en vivo |
| Supabase Storage | v3 — streaming / multimedia |
| Cloudflare Pages | Primer deploy (v1) |
| Stripe o similar | v5 — si se implementa seña |

### MCPs

| MCP | Cuándo agregar |
|---|---|
| GitHub MCP | Inicio del proyecto |
| Supabase MCP | Inicio del proyecto (v1) |
| Playwright MCP | v1 cuando se requiera testing E2E |
| Stripe MCP | v5 — si se implementa seña |

### Modelos de Claude

| Modelo | Cuándo usar |
|---|---|
| Sonnet 4.6 | Development iterativo diario |
| Opus 4.8 | Decisiones de arquitectura y spec |
| Haiku 4.5 | Tareas repetitivas o boilerplate |

### Skills de Claude Code

| Skill | Cuándo usar |
|---|---|
| `/init` | Al generar el CLAUDE.md |
| `feature-dev` | Para implementar cada feature desde el spec |
| `frontend-design` | Para UI/UX sin diseñador disponible |
| `code-review` | Antes del deploy de cada versión |
| `verify` | Para confirmar que un feature funciona en la app real |
