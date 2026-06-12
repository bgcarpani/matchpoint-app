/**
 * Reglas de dominio del torneo derivadas de spec.md.
 * Centralizado para que API routes y UI compartan una sola fuente de verdad.
 */
import type {
  CategoryType,
  Gender,
  TournamentStatus,
} from '@/lib/types/database'

// --- Ciclo de vida (transiciones unidireccionales, no se retrocede) ---
export const TOURNAMENT_LIFECYCLE: readonly TournamentStatus[] = [
  'draft',
  'published',
  'registration_open',
  'registration_closed',
  'in_progress',
  'finished',
] as const

/** Devuelve el estado siguiente válido, o null si ya está finalizado. */
export function nextStatus(current: TournamentStatus): TournamentStatus | null {
  const i = TOURNAMENT_LIFECYCLE.indexOf(current)
  return TOURNAMENT_LIFECYCLE[i + 1] ?? null
}

/** Sólo se permite avanzar exactamente un paso en el ciclo de vida. */
export function canTransition(
  from: TournamentStatus,
  to: TournamentStatus
): boolean {
  return nextStatus(from) === to
}

/** Las zonas sólo se generan/modifican en estos estados (spec: "Zonas"). */
export function canManageZones(status: TournamentStatus): boolean {
  return status === 'registration_closed' || status === 'in_progress'
}

// --- Categorías ---
export const INDIVIDUAL_CATEGORIES = [
  '1ra',
  '2da',
  '3ra',
  '4ta',
  '5ta',
  '6ta',
  '7ma',
  '8va',
] as const

export type IndividualCategory = (typeof INDIVIDUAL_CATEGORIES)[number]

/** Valida el `category_value` según el tipo de categoría. */
export function isValidCategoryValue(
  type: CategoryType,
  value: string
): boolean {
  if (type === 'individual') {
    return (INDIVIDUAL_CATEGORIES as readonly string[]).includes(value)
  }
  // suma: número libre positivo (ej. '14')
  const n = Number(value)
  return Number.isInteger(n) && n > 0
}

// --- Etiquetas para UI (es-AR) ---
export const STATUS_LABELS: Record<TournamentStatus, string> = {
  draft: 'Borrador',
  published: 'Publicado',
  registration_open: 'Inscripción abierta',
  registration_closed: 'Inscripción cerrada',
  in_progress: 'En curso',
  finished: 'Finalizado',
}

export const GENDER_LABELS: Record<Gender, string> = {
  male: 'Masculino',
  female: 'Femenino',
  mixed: 'Mixto',
}

export const CATEGORY_TYPE_LABELS: Record<CategoryType, string> = {
  individual: 'Individual',
  suma: 'Suma',
}

/** Etiqueta compacta de categoría: "6ta" (individual) o "Suma 14" (suma). */
export function categoryLabel(type: CategoryType, value: string): string {
  return type === 'individual' ? value : `Suma ${value}`
}
