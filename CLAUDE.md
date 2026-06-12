# Matchpoint App

## Proyecto
Plataforma web para la comunidad de padel orientada a organizadores y jugadores.
Objetivo a largo plazo: perfiles de jugador con historial, stats y rankings.
Las primeras versiones son organizer-first.

**Versión actual en desarrollo:** v1 — MVP (auto gestión de torneos)

## Documentos de referencia
- `functional-doc.md` — análisis funcional completo (todas las versiones)
- `spec.md` — especificación detallada de implementación de v1

## Stack
- Next.js 16 (App Router) + TypeScript
- Tailwind CSS + shadcn/ui
- Supabase (PostgreSQL + Auth)
- Deploy: Cloudflare Pages

> Regla: cada tecnología/herramienta se instala solo cuando es necesaria, no antes.

> IMPORTANTE (Next 16): tiene breaking changes respecto a versiones previas. Antes de
> escribir código específico de Next, consultar la doc local en `node_modules/next/dist/docs/`.
> Ver `AGENTS.md` en la raíz.

## Comandos
```
npm run dev      # desarrollo local
npm run build    # build de producción
npm run start    # servir build de producción
npm run lint     # linting
```
(Se completan al scaffoldear el proyecto.)

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
- Notificaciones (email / WhatsApp): v3
- Supabase Realtime: v2
- Supabase Storage / streaming: v3
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
