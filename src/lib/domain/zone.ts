/**
 * Reglas de dominio de zonas y partidos (spec.md "Gestión de zonas").
 * Fuente única de verdad compartida por server actions y UI.
 */
import type { MatchFormat } from '@/lib/types/database'

/** Etiquetas es-AR de cada formato de partido por zona (Feature 4, v2). */
export const MATCH_FORMAT_LABELS: Record<MatchFormat, string> = {
  round_robin: 'Todos contra todos',
  winner_vs_loser: 'Ganador vs perdedor',
  manual: 'Manual',
}

/** Descripción corta de cada formato para el selector. */
export const MATCH_FORMAT_HINTS: Record<MatchFormat, string> = {
  round_robin: 'Round-robin: cada pareja juega contra todas las demás.',
  winner_vs_loser:
    'Zona de 4: ronda 1, luego ganador-vs-ganador (1º/2º) y perdedor-vs-perdedor (3º/4º).',
  manual: 'Vos armás los partidos y fijás las posiciones a mano.',
}

/** winner_vs_loser sólo aplica a zonas de exactamente 4 parejas. */
export function supportsWinnerVsLoser(pairCount: number): boolean {
  return pairCount === 4
}

/** Sugerencia de cantidad de zonas: ~4 parejas por zona, mínimo 1. */
export function suggestZoneCount(acceptedPairs: number): number {
  if (acceptedPairs < 2) return 1
  return Math.max(1, Math.round(acceptedPairs / 4))
}

/** Máximo de zonas posibles: no puede haber más zonas que parejas aceptadas. */
export function maxZoneCount(acceptedPairs: number): number {
  return Math.max(1, acceptedPairs)
}

/** Mensajes de error de las RPCs de zonas, mapeados a texto es-AR para la UI. */
export const ZONE_ERROR_LABELS: Record<string, string> = {
  NOT_OWNER: 'No tenés permiso sobre este torneo.',
  TOURNAMENT_NOT_FOUND: 'No se encontró el torneo.',
  INVALID_STATUS:
    'Las zonas se generan con la inscripción cerrada o el torneo en curso.',
  ZONES_PUBLISHED: 'Las zonas ya están publicadas y no se pueden modificar.',
  INVALID_ZONE_COUNT: 'La cantidad de zonas no es válida.',
  NOT_ENOUGH_PAIRS: 'Se necesitan al menos 2 parejas aceptadas.',
  TOO_MANY_ZONES: 'Hay más zonas que parejas aceptadas.',
  ZONE_NOT_FOUND: 'No se encontró la zona.',
  PAIR_NOT_IN_ZONES: 'La pareja no está asignada a ninguna zona.',
  NO_MATCHES: 'La zona no tiene partidos para cerrar posiciones.',
  MATCHES_PENDING:
    'Cargá el resultado de todos los partidos antes de cerrar las posiciones.',
  WVL_NEEDS_4:
    'El formato ganador-vs-perdedor necesita exactamente 4 parejas en la zona.',
  WRONG_FORMAT: 'La operación no corresponde al formato de esta zona.',
  ROUND1_PENDING:
    'Cargá el resultado de los dos partidos de la ronda 1 antes de generar la ronda 2.',
  ROUND2_PLAYED:
    'La ronda 2 ya tiene resultados. Borralos antes de regenerarla.',
  ROUND2_PENDING:
    'Generá la ronda 2 y cargá sus resultados antes de cerrar las posiciones.',
  USE_MANUAL_FREEZE: 'Esta zona es manual: fijá las posiciones a mano.',
  MANUAL_POSITIONS_INVALID:
    'Las posiciones cargadas no son válidas (deben cubrir todas las parejas, sin repetir).',
}

/**
 * Fila de standings de una zona: métricas en vivo (desde `zone_standings_view`)
 * + la posición congelada (de `zone_pairs`, null mientras no se cierren).
 */
export interface StandingRow {
  pairId: string
  label: string
  position: number | null
  played: number
  won: number
  lost: number
  gamesFor: number
  gamesAgainst: number
  gamesDiff: number
  points: number
}

/**
 * Orden de la tabla de posiciones. Si están congeladas (position no null) se
 * respeta esa posición; si no, se ordena en vivo por puntos → diferencia de
 * games → games a favor (desempate determinístico, igual que freeze_*).
 */
export function sortStandings(rows: StandingRow[]): StandingRow[] {
  return [...rows].sort((a, b) => {
    if (a.position != null && b.position != null) return a.position - b.position
    if (a.position != null) return -1
    if (b.position != null) return 1
    return (
      b.points - a.points ||
      b.gamesDiff - a.gamesDiff ||
      b.gamesFor - a.gamesFor ||
      a.label.localeCompare(b.label)
    )
  })
}

/** Traduce un mensaje de error de Postgres/RPC a texto para la UI. */
export function zoneErrorLabel(message: string | undefined): string {
  if (!message) return 'No se pudo completar la operación.'
  for (const code of Object.keys(ZONE_ERROR_LABELS)) {
    if (message.includes(code)) return ZONE_ERROR_LABELS[code]
  }
  return 'No se pudo completar la operación.'
}
