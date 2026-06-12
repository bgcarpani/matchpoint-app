/**
 * Reglas de dominio de zonas y partidos (spec.md "Gestión de zonas").
 * Fuente única de verdad compartida por server actions y UI.
 */

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
}

/** Traduce un mensaje de error de Postgres/RPC a texto para la UI. */
export function zoneErrorLabel(message: string | undefined): string {
  if (!message) return 'No se pudo completar la operación.'
  for (const code of Object.keys(ZONE_ERROR_LABELS)) {
    if (message.includes(code)) return ZONE_ERROR_LABELS[code]
  }
  return 'No se pudo completar la operación.'
}
