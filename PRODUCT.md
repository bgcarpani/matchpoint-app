# Product

## Register

product

## Users

**Primarios — Organizadores.** Dueños de clubes / canchas de pádel que arman y gestionan
torneos. Contexto de uso: sentados frente a la compu o desde el cel armando zonas, aceptando
inscripciones, cargando resultados. Quieren resolver rápido y sin fricción una tarea operativa
(crear torneo, gestionar parejas, generar zonas/llaves). Valoran densidad de información,
claridad y velocidad de flujo por encima de la decoración.

**Secundarios — Jugadores.** Llegan a las superficies públicas (landing, página pública de
torneo, zonas, llaves, links compartidos por WhatsApp/historia). No tienen login (hasta v4).
Contexto de uso: **mayormente desde el cel, muchas veces en el club / al sol**, para inscribirse,
ver su zona, su próximo partido o el campeón. Quieren entender de un vistazo dónde y cuándo juegan.

Las dos superficies pesan igual: un único sistema de diseño debe servir tanto a la herramienta
de gestión como a la cara pública que se comparte.

## Product Purpose

Plataforma web (PWA) para la comunidad de pádel, **organizer-first**: que un organizador pueda
correr un torneo completo de punta a punta —inscripción de parejas, aceptación, zonas round-robin,
llaves, resultados y standings— sin planillas ni grupos de WhatsApp caóticos. La cara pública
convierte ese trabajo en algo presentable y compartible (calendario, QR, historias de IG, links).
Éxito = el organizador gestiona todo en un lugar y el jugador entiende su situación en un vistazo,
sin preguntar. A largo plazo: perfiles de jugador con historial, stats y rankings.

## Brand Personality

**Deportivo, preciso, con pulso.** Energía atlética de cancha ejecutada con el craft de un
producto SaaS moderno. La tensión productiva del proyecto: *enérgico pero impecable* — nunca
ruidoso por ruidoso, nunca plano por seguro.

- **Voz:** directa, en español rioplatense, sin jerga corporativa ("Organizá tu torneo", no
  "Gestione sus eventos deportivos"). Confiada, no solemne.
- **3 palabras:** atlético · afilado · controlado.
- **Sensación objetivo:** la de un buen tablero de resultados — vivo, legible, con jerarquía
  clara y un acento que marca lo que importa. Movimiento intencional, no decorativo.

## Anti-references

- **Template genérico de IA — el enemigo #1.** Nada de fuente Inter por defecto, gradiente
  violeta→azul, cards anidadas, todo centrado y a media opacidad. Si parece el `shadcn new` recién
  scaffoldeado, está mal. Cada decisión (tipo, color, espaciado, densidad) tiene que ser deliberada.
- **Betting/casino recargado:** nada de neón saturado por todos lados ni estética de apuestas.
  La energía deportiva se logra con jerarquía, tipografía y un acento bien usado, no con saturación.
- Corporativo plano (azul intranet sin alma) e infantil/pastel quedan ambos fuera por defecto.

## Design Principles

1. **Enérgico pero impecable.** Cada pantalla puede tener pulso atlético, pero ejecutado con
   precisión de SaaS: alineación perfecta, espaciado rítmico, microdetalle cuidado. La energía
   nunca es excusa para el desorden.
2. **Jerarquía antes que decoración.** El impacto viene de contraste de tamaño/peso/color y de
   ritmo de espaciado — no de sombras, gradientes ni cards apiladas. Las cards son el último
   recurso, no el primero.
3. **Scoreboard mindset.** Es una app de torneos: números tabulares, estados claros, lo importante
   (cupos, resultados, quién juega contra quién, el campeón) se lee de un vistazo. Densidad con aire.
4. **Una sola voz en dos superficies.** El mismo sistema de tokens/componentes sirve a la app del
   organizer (densa, eficiente) y a las públicas (expresivas, compartibles). Coherencia total.
5. **Mobile y cancha-proof.** Gran parte del público público está en el cel, a veces al sol.
   Legible y tappable en pantalla chica con buena luz, aunque la estética mande.

## Accessibility & Inclusion

El usuario priorizó **estética sobre requisitos formales** — no hay un piso WCAG contractual.
Aun así, por el contexto de uso (cel, al sol, público amplio) se mantiene un mínimo razonable y
no negociable: **contraste de texto legible** (apuntar a AA, ~4.5:1 en cuerpo; jamás gris claro
"elegante" sobre fondo tintado), **foco visible** en interactivos, **targets tappables** (~44px)
en mobile, y **`prefers-reduced-motion` respetado** (ya implementado para `.reveal`). La
accesibilidad acompaña la estética, no la bloquea.
