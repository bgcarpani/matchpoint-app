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
- El seguimiento en tiempo real (Realtime) de bracket y posiciones está **postergado** (decisión de
  producto, 2026-06-13): no es el foco actual. Por ahora la vista pública se refresca en navegación /
  recarga. Se retoma más adelante. Detalle en `spec-v2.md` → Feature 6.
- El organizador puede preferir gestión manual en su cancha

### Refinamientos adicionales v2 (independientes del motor de resultados)
- **Calendario público del organizador**: cada organizador tiene una URL estática por establecimiento
  (slug corto no adivinable, ej. `/o/x7k2qp`) pensada para generar un **QR imprimible** y pegarlo en la
  pared. Quien lo escanea ve, sin login, los torneos vigentes del momento (publicados y no finalizados)
  y entra a inscribirse en cada uno. La URL es estable; el contenido cambia solo.
- **Anti-duplicado de inscripción por email**: no se puede enviar una nueva solicitud a un torneo si
  el email de alguno de los dos jugadores ya tiene una solicitud **pendiente o aceptada** en ese
  mismo torneo. Las rechazadas no bloquean (pueden re-inscribirse).
- **Refinamientos de UI/UX de zonas** (en lugar de Realtime): filtrado por zona funcional en la vista
  pública (`/t/[id]/zones`); en el manager del organizador, las tarjetas de partido son compactas
  (estilo marcador) y los partidos viven en una sección "Partidos" separada de parejas y posiciones,
  para reducir el alto de pantalla.

> Detalle de implementación en `spec-v2.md`.

---

## Versión 3 — Comunicaciones (Notificaciones + Compartir)

> La transmisión en vivo / streaming, antes tentativamente en v3, se difirió a la **última versión**
> (ver más abajo). v3 se enfoca en comunicaciones livianas: email transaccional y botones de compartir.

### Notificaciones por email
- Al jugador: aviso cuando envía su solicitud (estado pendiente) con link de seguimiento
- Al jugador: aviso cuando su inscripción es aceptada o rechazada (con info adicional a futuro)
- Destinatario: el **jugador 1** (quien carga la inscripción y deja su email de contacto). Un fallo de
  envío nunca rompe la acción de negocio (inscripción / aceptación / rechazo)
- Proveedor: Resend (también usado como SMTP de Supabase Auth para confirmación + reset de contraseña)
- WhatsApp como canal de notificación **automática**: pospuesto (requiere Business API + plantillas
  aprobadas + costo). El teléfono ya se guarda desde v1, así que es factible retomarlo más adelante.

### Compartir (redes)
- Botón "Compartir en WhatsApp" en el torneo, el calendario público y el campeón (post-llaves)
- Botón "Compartir en historia de Instagram" con imagen generada (Instagram no admite compartir por URL)

### Refinamiento de plataforma — PWA (app instalable + offline)
La aplicación es una **PWA**: el mismo deploy sirve tanto la web normal como la "app instalada", sin
build separado. Instalar es **opcional por usuario** y el acceso web queda intacto.
- **Instalable**: se puede agregar a la pantalla de inicio (móvil) o instalar como app (escritorio),
  con su propio ícono y splash, gracias al manifest y los íconos de la app.
- **Offline**: una vez visitadas, las **vistas públicas** (torneo, calendario, zonas, llaves) quedan
  disponibles sin conexión. El **área del organizador** (dashboard, canchas, torneos) **no se cachea**
  para no guardar datos personales en el dispositivo: siempre requiere red.
- **Notificaciones push** (Web Push): quedan pospuestas para una **fase 2** sobre la misma base PWA.

> Nota de alcance: la app nativa quedó pospuesta. Una historia de Instagram con enlace *clickeable*
> generado por nosotros requeriría app nativa y, aun así, no daría link clickeable desde web; por eso
> se mantiene el flujo de compartir descripto arriba (imagen + sticker de enlace manual).

---

## Versión 3 (parte 2) — Branding del organizador y presentación
Refinamiento estético sobre v3, sin tocar la lógica de negocio. El organizador gana **identidad
propia** y la plataforma mejora su **autopromoción**.

### Identidad del organizador (post-registro)
- **Logo / imagen** de la organización (se sube a la app).
- **Dirección / ubicación** del establecimiento, visible en las páginas públicas de sus torneos y
  en su calendario (ayuda al jugador a saber dónde se juega).
- **Paleta de marca:** el organizador elige, de un set curado de estilos, los **colores** que tiñen
  su dashboard, sus páginas públicas y sus imágenes de difusión (una sola elección de marca para
  todo). Mantiene la coherencia del sistema visual: cambia el acento, no la estructura.

### Presentación / landing
- Más **contenido promocional** en el inicio: además de lo que la app ya hace, una sección
  **"Próximamente"** que adelanta la visión a futuro (perfiles + rankings, reserva de turnos,
  transmisión en vivo) de forma honesta, sin prometer fechas.
- El ejemplo estático de "llaves" del hero pasa a ser un **carousel** que rota solo, mostrando
  varias caras del producto (llaves, posiciones, calendario/QR, campeón).
- **Transiciones** sutiles entre páginas para dar sensación de fluidez.

> Detalle de implementación en `spec-v3-2.md`. Esta tanda **adelanta el uso de Supabase Storage**
> (para los logos) respecto del plan original que lo difería a la última versión.

---

## Versión 4 — Perfiles de jugador, stats y **rankings**
Esta versión marca el punto donde el jugador se convierte en usuario pleno de la plataforma, y su
**objetivo central son los rankings**: el norte de largo plazo del producto (ver "Visión del
producto") se materializa acá. El perfil y las stats son la base de datos sobre la que se calcula
el ranking de la comunidad.
- Login de jugadores: registro y autenticación propia
- Perfil de jugador: historial de torneos jugados, resultados, compañeros frecuentes
- Stats individuales: puntos acumulados, partidos ganados/perdidos, rendimiento por categoría
- **Rankings (foco de la versión):** ranking de jugadores de la comunidad. Arranca **manual** hasta
  implementar un **sistema de puntos automático** que se nutre de los resultados de cada torneo.
  El historial guardado desde v1 alimenta estas estadísticas **sin necesidad de migración**.
- El DNI/identificador guardado desde v1 es el nexo que vincula la actividad previa al nuevo perfil

---

## Versión 5 — Auto gestión de turnos
- Organizadores configuran disponibilidad de sus canchas (horarios, días)
- Jugadores envían solicitud de turno (posible seña, a refinar)
- Organizador acepta o rechaza
- Soporte para turnos fijos con intervalo de repetición configurable
- El modelo de Court diseñado desde v1 soporta esta extensión sin cambios estructurales

---

## Última versión (aspiracional) — Transmisión en vivo
- Establecimientos con capacidad de streaming transmiten sus partidos por la app
- Infraestructura pesada (CDN, encoding, Supabase Storage / multimedia) — no condiciona el diseño previo
- Diferida fuera de v3 por decisión de producto; se retoma como cierre de la plataforma

---

## Stack tecnológico y herramientas de desarrollo

> Todas las herramientas deben instalarse o activarse únicamente cuando sean necesarias, no antes.

### Tecnologías

| Herramienta | Cuándo agregar |
|---|---|
| Next.js 16 (App Router) + TypeScript | Inicio del proyecto |
| Tailwind CSS + shadcn/ui | Inicio del proyecto |
| Supabase (PostgreSQL + Auth) | Inicio del proyecto (v1) |
| Supabase Realtime | v2 — brackets en vivo (postergado por decisión de producto) |
| Resend (email transaccional) | v3 — notificaciones + auth por email |
| Serwist (PWA: instalable + offline) | v3 — app instalable, service worker |
| Supabase Storage | v3 (parte 2) — logos de organización · última versión — streaming / multimedia |
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
