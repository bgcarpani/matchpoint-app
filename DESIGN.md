---
name: Matchpoint
description: Scoreboard atlético con craft de SaaS — gestión de torneos de pádel.
colors:
  primary: "#2D52E8"
  primary-deep: "#1E3FAE"
  primary-tint: "#DBE3FB"
  primary-surface: "#F5F8FF"
  ink: "#0D1020"
  muted: "#69728A"
  faint: "#B4BAC6"
  page: "#F4F5F8"
  surface: "#FFFFFF"
  border: "#E3E5EC"
  border-strong: "#D6DAE4"
  divider: "#EEF0F4"
  success: "#0E9C77"
  success-deep: "#0E6E55"
  success-tint: "#D6F2E8"
  warning: "#C77B12"
  warning-tint: "#FAEEDA"
  danger: "#DC4B43"
  danger-tint: "#FCEBEB"
typography:
  display:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "clamp(2rem, 8vw, 5rem)"
    fontWeight: 800
    lineHeight: 0.92
    letterSpacing: "-0.02em"
    fontVariation: "'wdth' 125"
  headline:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.02em"
    fontVariation: "'wdth' 118"
  title:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "normal"
  body:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
  label:
    fontFamily: "Archivo, system-ui, sans-serif"
    fontSize: "0.625rem"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "0.1em"
  mono:
    fontFamily: "'JetBrains Mono', ui-monospace, monospace"
    fontSize: "0.8125rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "normal"
rounded:
  sm: "6px"
  md: "9px"
  lg: "12px"
  xl: "14px"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "22px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "11px 15px"
  button-primary-hover:
    backgroundColor: "{colors.primary-deep}"
    textColor: "{colors.surface}"
    rounded: "{rounded.md}"
    padding: "11px 15px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "11px 15px"
  chip-info:
    backgroundColor: "{colors.primary-tint}"
    textColor: "{colors.primary-deep}"
    rounded: "{rounded.sm}"
    padding: "4px 8px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "14px 16px"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
  input-focus:
    backgroundColor: "{colors.page}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
---

# Design System: Matchpoint

## 1. Overview

**Creative North Star: "El Scoreboard Limpio"**

Matchpoint se ve como un buen tablero de resultados deportivo ejecutado por un equipo de
producto que se obsesiona con el detalle. La energía es atlética —titulares grandes y
expandidos, números de marcador, estados vivos— pero la ejecución es de SaaS moderno:
alineación perfecta, ritmo de espaciado deliberado, superficies blancas limpias sobre un
off-white frío. Es claro por defecto, no oscuro; la energía no viene de neón sobre negro sino
de **jerarquía, un azul real bien usado y tipografía con carácter**.

El sistema sirve a dos superficies con una sola voz: la app del organizer (densa, eficiente,
tipo panel) y las páginas públicas que ve el jugador (expresivas, compartibles). El mismo set
de tokens y componentes vale para ambas; cambia la densidad, no el idioma.

Lo que este sistema **rechaza explícitamente**: el template genérico de IA (fuente Inter,
gradiente violeta→azul, cards anidadas, todo centrado a media opacidad); la estética de
betting/casino con neón saturado; el azul corporativo plano sin alma; y lo infantil/pastel.

**Key Characteristics:**
- Claro, frío, limpio: off-white `#F4F5F8` + superficies blancas, no crema ni beige.
- Un solo acento de identidad: azul real `#2D52E8`, usado con intención, no por todos lados.
- Números siempre en mono tabular: look de scoreboard, alineación perfecta de cifras.
- Titulares en Archivo expandida, uppercase, tight: protagonistas, no decoración.
- Jerarquía y densidad antes que cards apiladas. Las cards son el último recurso.

## 2. Colors

Una paleta fría y nítida: neutros casi sin tinte, un azul real como única voz de marca, y
semánticos (verde/ámbar/rojo) reservados para estado.

### Primary
- **Azul Real** (`#2D52E8`): el acento de identidad. Botón primario, link activo, indicador de
  "en curso/en juego", número de líder, borde de fila destacada, bloque de Campeón. Es la única
  voz cromática de marca; su escasez relativa es lo que lo hace fuerte.
- **Azul Profundo** (`#1E3FAE`): texto de azul sobre fondos tintados claros (chips, pills) y
  estado hover/active del botón primario. Garantiza contraste donde el azul pleno no alcanza.
- **Azul Tinte** (`#DBE3FB`) y **Azul Superficie** (`#F5F8FF`): rellenos suaves para chips de
  estado "info", avatares de iniciales y el fondo de la fila/celda destacada en tablas.

### Neutral
- **Ink** (`#0D1020`): texto principal, titulares, cifras. Casi negro con un dejo frío.
- **Muted** (`#69728A`): texto secundario, labels, metadatos, encabezados de tabla.
- **Faint** (`#B4BAC6`): texto deshabilitado, ceros/valores nulos, separadores de marcador.
- **Page** (`#F4F5F8`): fondo de página. Off-white frío, chroma ~0; NUNCA crema/beige.
- **Surface** (`#FFFFFF`): superficie de cards, tablas, inputs, header.
- **Border** (`#E3E5EC`) / **Border Strong** (`#D6DAE4`) / **Divider** (`#EEF0F4`): bordes de
  superficie, bordes en hover/énfasis, y divisores internos finos de filas.

### Tertiary (semánticos — solo estado)
- **Éxito** (`#0E9C77`, texto `#0E6E55`, tinte `#D6F2E8`): inscripción abierta/aceptada,
  diferencia de games positiva, confirmaciones.
- **Advertencia** (`#C77B12`, tinte `#FAEEDA`): pendientes, seña/pago pendiente, avisos.
- **Peligro** (`#DC4B43`, tinte `#FCEBEB`): errores de validación, rechazado/cancelado,
  diferencia de games negativa.

### Named Rules
**La Regla de Una Voz.** El azul real es el único color de marca. No se inventan acentos
secundarios decorativos. Verde, ámbar y rojo aparecen SOLO cuando codifican estado, nunca
para "dar color". Si una pantalla tiene tres acentos compitiendo, está mal.

**La Regla del Off-White Frío.** El fondo de página es `#F4F5F8` (frío, chroma ~0). Prohibido
derivar a crema/beige/sand/parchment — es el default de IA 2026 y mata la identidad.

## 3. Typography

**Display Font:** Archivo (variable, con eje de ancho `wdth`), fallback system-ui / sans-serif.
**Body Font:** Archivo (ancho normal), mismas familia y fallback.
**Label/Mono Font:** JetBrains Mono (con fallback `ui-monospace, monospace`).

**Character:** Una sola familia humanista-grotesca (Archivo) llevada a dos extremos —expandida
y pesada para titulares de scoreboard, normal para cuerpo— pareada con una mono geométrica solo
para cifras. El contraste vive en el eje de ancho y peso de Archivo + la mono para números, no
en pares de fuentes parecidas.

### Hierarchy
- **Display** (800, `clamp(2rem, 8vw, 5rem)`, lh 0.92, `wdth 125`, uppercase, tracking -0.02em):
  hero de landing, nombre de torneo, bloque de Campeón. Protagonista absoluto.
- **Headline** (800, ~1.75rem, lh 1, `wdth 118`, uppercase): títulos de sección y de página
  ("Tus torneos", "Inscribí tu pareja", "Zona A").
- **Title** (700, ~0.9375rem): nombres dentro de filas/cards (torneo, pareja), labels de input.
- **Body** (400, ~0.875rem, lh 1.55): descripciones y prosa. Tope de línea 65–75ch.
- **Label** (600, ~0.625rem, tracking 0.1em, uppercase): encabezados de tabla, eyebrows,
  metadatos de card ("PAREJAS", "CANCHA 2", "POSICIONES").
- **Mono** (700, ~0.8125rem, tabular): toda cifra que cuenta —puntos, games, cupos, posición,
  DNI, horarios, fechas cortas. Da alineación de marcador.

### Named Rules
**La Regla del Marcador.** Todo número que comunique un dato (puntos, games, cupos, posición,
diferencia, horario) va en JetBrains Mono con `font-variant-numeric: tabular-nums`. Los números
nunca usan la fuente de texto.

**La Regla del Titular Expandido.** Los titulares son Archivo `wdth ≥ 115`, 800, uppercase,
tracking -0.02em, line-height ≤ 0.95. Nada de titulares finos o de ancho normal: el peso
expandido ES la marca.

## 4. Elevation

Sistema **plano por capas tonales, no por sombras**. La profundidad se construye apilando tres
tonos (`page #F4F5F8` < `surface #FFFFFF` con borde de 1px) y, donde hace falta jerarquía
interna, el azul superficie `#F5F8FF`. No hay drop-shadows ambientales decorativas.

### Shadow Vocabulary
- **Focus ring** (`box-shadow: 0 0 0 3px rgba(45,82,232,0.13)`): único uso de sombra. Aparece
  SOLO en el input/control con foco, junto al borde azul. Es funcional, no estético.

### Named Rules
**La Regla Plana por Defecto.** Las superficies son planas en reposo: se distinguen por tono y
borde de 1px, nunca por sombra. La sombra solo aparece como respuesta a un estado (foco). Si una
card "flota" con drop-shadow en reposo, está mal: subila de tono o reforzá el borde.

## 5. Components

### Buttons
- **Shape:** esquinas suaves (9px, `{rounded.md}`).
- **Primary:** fondo azul real (`#2D52E8`), texto blanco, peso 700–800. En CTAs de marca
  (inscribirme, enviar) el texto va en Archivo expandida uppercase; en acciones de app (nuevo
  torneo) en peso 700 normal. Padding `11px 15px`.
- **Hover / Focus:** hover → azul profundo (`#1E3FAE`); focus-visible → focus ring azul. Sin
  translateY ni rebote; transición de color suave.
- **Secondary / Ghost:** fondo blanco con borde `#E3E5EC`, texto ink; hover sube el borde a
  `#D6DAE4` y el fondo a `#F4F5F8`. Para link-as-button usar `buttonVariants()` (el Button de
  shadcn corre sobre @base-ui y no tiene `asChild`).

### Chips / Pills (estado)
- **Style:** relleno tintado del color de estado + texto en el tono profundo de la MISMA familia
  (info: `#DBE3FB`/`#1E3FAE`; éxito: `#D6F2E8`/`#0E6E55`; etc.). Radio 6px. Texto label uppercase
  600, tracking 0.06–0.1em. Estado "en vivo" lleva un punto `●` del color pleno.
- **State:** las pills de estado de torneo (Borrador/Inscripción/En curso/Finalizado) se mapean
  1:1 a la familia semántica. Borrador usa neutro (`#EDEFF3`/`#69728A`).

### Cards / Containers
- **Corner Style:** 12px (`{rounded.lg}`); contenedores chicos/filas 9–10px.
- **Background:** blanco (`#FFFFFF`) sobre página off-white.
- **Shadow Strategy:** ninguna (ver Elevation). Se distinguen por borde de 1px `#E3E5EC`.
- **Border:** 1px `#E3E5EC`. La fila/celda destacada (líder de zona, ganador de llave) lleva
  `border-left: 2px solid #2D52E8` + fondo `#F5F8FF`. Bordes de un solo lado → sin radio en
  ese lado.
- **Internal Padding:** 14–16px en cards; 9–13px en filas de tabla.

### Inputs / Fields
- **Style:** fondo blanco, borde 1px `#DDE1E9`, radio 9px, texto ink, label Title 700 arriba.
- **Focus:** borde azul `#2D52E8` + focus ring `0 0 0 3px rgba(45,82,232,0.13)` + fondo a
  `#F4F5F8`.
- **Error:** borde y mensaje en rojo (`#DC4B43`), ícono `alert-circle` inline, texto bajo el campo.

### Navigation
- **Style:** header blanco, alto ~54px, borde inferior 1px. Wordmark "MATCH**POINT**" (POINT en
  azul). Links en Title 600; activo en ink con subrayado azul de 2px pegado al borde inferior del
  header; inactivos en muted. Cuenta como avatar de iniciales (tinte azul). Mobile: colapsa a
  menú; las públicas usan header reducido con acciones de compartir.

### Signature Component — Scoreboard / Standings
La tabla de posiciones y las cards de partido son el componente firma. Posiciones: grid con
columnas `# / Pareja / PJ / DG / PTS`, encabezado en Label uppercase, cifras en mono, líder con
borde-izquierdo azul y fondo `#F5F8FF`, diferencia de games en verde/rojo. Cards de partido:
estado (Label uppercase) + cancha arriba, dos parejas con su marcador en mono; "en juego" usa
azul, "finalizado" neutro, "programado" borde punteado.

## 6. Do's and Don'ts

### Do:
- **Do** usar el azul real `#2D52E8` como única voz de marca, con intención y moderación
  (La Regla de Una Voz).
- **Do** poner toda cifra (puntos, games, cupos, posición, horarios) en JetBrains Mono tabular
  (La Regla del Marcador).
- **Do** construir profundidad por tono + borde de 1px, plano en reposo (La Regla Plana por Defecto).
- **Do** titulares en Archivo expandida (`wdth ≥ 115`), 800, uppercase, tracking -0.02em.
- **Do** marcar al líder/ganador con `border-left: 2px solid #2D52E8` + fondo `#F5F8FF`.
- **Do** reservar verde/ámbar/rojo exclusivamente para estado (aceptado, pendiente, error/rechazado).

### Don't:
- **Don't** caer en el template genérico de IA: nada de fuente Inter, gradiente violeta→azul,
  cards anidadas, ni todo centrado a media opacidad. Si parece un `shadcn new` recién scaffoldeado,
  está mal.
- **Don't** derivar el fondo a crema/beige/sand/parchment — off-white FRÍO `#F4F5F8` siempre
  (La Regla del Off-White Frío).
- **Don't** usar neón saturado ni estética de betting/casino para "dar energía".
- **Don't** poner drop-shadows ambientales en superficies en reposo; la sombra es solo el focus ring.
- **Don't** usar la fuente de texto para números, ni titulares finos o de ancho normal.
- **Don't** anidar cards dentro de cards; si necesitás jerarquía interna, usá tono (`#F5F8FF`) o
  un divisor de 1px, no otra card.
