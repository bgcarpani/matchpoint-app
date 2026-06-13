/**
 * Reglas/labels de la fase de llaves (bracket), Feature 5 (spec-v2).
 * Puro, compartido por server + UI.
 */

/**
 * Nombre de la ronda según su distancia a la final. `round` cuenta desde 1
 * (primera ronda) hasta `totalRounds` (la final).
 */
export function bracketRoundLabel(round: number, totalRounds: number): string {
  const fromFinal = totalRounds - round
  if (fromFinal === 0) return 'Final'
  if (fromFinal === 1) return 'Semifinal'
  if (fromFinal === 2) return 'Cuartos de final'
  if (fromFinal === 3) return 'Octavos de final'
  if (fromFinal === 4) return 'Dieciseisavos'
  return `Ronda ${round}`
}

/** Mensajes es-AR de los errores de las RPCs del bracket. */
export const BRACKET_ERROR_LABELS: Record<string, string> = {
  TOURNAMENT_NOT_FOUND: 'No se encontró el torneo.',
  MATCH_NOT_FOUND: 'No se encontró el partido.',
  NOT_OWNER: 'No tenés permiso sobre este torneo.',
  INVALID_STATUS: 'El torneo tiene que estar en curso.',
  BRACKET_PUBLISHED: 'Las llaves ya están publicadas; no se pueden regenerar.',
  BRACKET_STARTED: 'Ya hay resultados cargados: no se pueden reacomodar los cruces.',
  NO_ZONES: 'Primero generá las zonas del torneo.',
  ZONES_NOT_FROZEN: 'Cerrá las posiciones de todas las zonas antes de generar las llaves.',
  NOT_ENOUGH_QUALIFIERS: 'Hacen falta al menos 2 clasificados para armar las llaves.',
  NOT_BRACKET: 'El partido no es de la fase de llaves.',
  MATCH_NOT_READY: 'El partido todavía no tiene definidas las dos parejas.',
  INVALID_WINNER: 'El ganador tiene que ser una de las dos parejas del partido.',
  PAIR_NOT_IN_BRACKET: 'La pareja no está en las llaves.',
}

export function bracketError(message: string | undefined | null): string {
  if (!message) return 'No se pudo completar la acción.'
  for (const code of Object.keys(BRACKET_ERROR_LABELS)) {
    if (message.includes(code)) return BRACKET_ERROR_LABELS[code]
  }
  return 'No se pudo completar la acción.'
}
