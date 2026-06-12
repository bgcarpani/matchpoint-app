import type { CourtType } from '@/lib/types/database'

export const COURT_TYPE_LABELS: Record<CourtType, string> = {
  indoor: 'Techada',
  outdoor: 'Aire libre',
}

export const COURT_TYPES: readonly CourtType[] = ['indoor', 'outdoor'] as const
