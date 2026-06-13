/**
 * Reglas de scoring de partidos (Feature 3, spec-v2).
 * Funciones puras compartidas por la server action (autoritativa) y la UI.
 *
 * Dos modos por torneo:
 *  - `games`: 1 set; team1_score/team2_score = games. `gamesPerSet` (6 o 7) es
 *    el largo del set; el ganador debe alcanzarlo. Sin empates.
 *  - `best_of_3_sets`: se gana al ganar 2 sets. team1_score/team2_score = sets
 *    ganados (2–0 / 2–1); `score_detail` guarda el detalle por set.
 */
import type { ScoringMode } from '@/lib/types/database'

export const SCORING_MODE_LABELS: Record<ScoringMode, string> = {
  games: 'Games (1 set)',
  best_of_3_sets: 'Al mejor de 3 sets',
}

export const GAMES_PER_SET_OPTIONS = [6, 7] as const

/** Resultado normalizado, listo para persistir en `matches`. */
export interface ResultComputation {
  /** games (modo games) o sets ganados (best_of_3_sets) */
  team1_score: number
  team2_score: number
  winner: 'team1' | 'team2'
  /** desglose por set en best_of_3_sets; null en modo games */
  score_detail: number[][] | null
}

/** Entrada cruda del form de resultado, según el modo del torneo. */
export type RecordResultInput =
  | { games1: number; games2: number }
  | { sets: [number, number][] }

const MAX_GAMES = 99

function validSet(a: number, b: number): boolean {
  return (
    Number.isInteger(a) &&
    Number.isInteger(b) &&
    a >= 0 &&
    b >= 0 &&
    a <= MAX_GAMES &&
    b <= MAX_GAMES
  )
}

/** Modo `games`: un único set; el ganador llega a `gamesPerSet`, sin empate. */
export function computeGamesResult(
  g1: number,
  g2: number,
  gamesPerSet: number
): ResultComputation | { error: string } {
  if (!validSet(g1, g2))
    return { error: 'Cargá los games de cada pareja (números enteros ≥ 0).' }
  if (g1 === g2)
    return { error: 'No puede haber empate: tiene que haber un ganador.' }
  if (Math.max(g1, g2) < gamesPerSet)
    return { error: `El ganador del set debe llegar a ${gamesPerSet} games.` }
  return {
    team1_score: g1,
    team2_score: g2,
    winner: g1 > g2 ? 'team1' : 'team2',
    score_detail: null,
  }
}

/** Modo `best_of_3_sets`: 2 o 3 sets; gana quien llega a 2 sets. */
export function computeSetsResult(
  sets: [number, number][],
  gamesPerSet: number
): ResultComputation | { error: string } {
  if (!Array.isArray(sets) || sets.length < 2 || sets.length > 3)
    return { error: 'Cargá 2 o 3 sets para definir el partido.' }

  let s1 = 0
  let s2 = 0
  for (const [a, b] of sets) {
    if (!validSet(a, b)) return { error: 'Hay un set con games inválidos.' }
    if (a === b) return { error: 'Cada set tiene que tener un ganador.' }
    if (Math.max(a, b) < gamesPerSet)
      return { error: `El ganador de cada set debe llegar a ${gamesPerSet} games.` }
    if (a > b) s1 += 1
    else s2 += 1
  }

  // El partido se define al ganar 2 sets: el resultado final es 2–0 o 2–1.
  const max = Math.max(s1, s2)
  const min = Math.min(s1, s2)
  if (max !== 2 || min > 1)
    return { error: 'El partido se gana al ganar 2 sets (2–0 o 2–1).' }
  // Un 2–0 no admite un tercer set.
  if (sets.length === 3 && min === 0)
    return { error: 'Con un 2–0 no se juega el tercer set.' }

  return {
    team1_score: s1,
    team2_score: s2,
    winner: s1 > s2 ? 'team1' : 'team2',
    score_detail: sets,
  }
}

/** Despacha al cómputo según el modo del torneo. */
export function computeResult(
  mode: ScoringMode,
  gamesPerSet: number,
  input: RecordResultInput
): ResultComputation | { error: string } {
  if (mode === 'games') {
    if (!('games1' in input))
      return { error: 'Este torneo se carga por games.' }
    return computeGamesResult(input.games1, input.games2, gamesPerSet)
  }
  if (!('sets' in input)) return { error: 'Este torneo se carga por sets.' }
  return computeSetsResult(input.sets, gamesPerSet)
}

/** Texto compacto del resultado para mostrar en listas (es-AR). */
export function formatResult(
  mode: ScoringMode,
  team1Score: number | null,
  team2Score: number | null,
  scoreDetail: number[][] | null
): string | null {
  if (team1Score == null || team2Score == null) return null
  if (mode === 'best_of_3_sets' && scoreDetail?.length) {
    return scoreDetail.map(([a, b]) => `${a}-${b}`).join(' · ')
  }
  return `${team1Score}-${team2Score}`
}
