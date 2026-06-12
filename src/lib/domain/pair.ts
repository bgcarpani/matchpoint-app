import type { PairStatus } from '@/lib/types/database'

export const PAIR_STATUS_LABELS: Record<PairStatus, string> = {
  pending: 'Pendiente',
  accepted: 'Aceptada',
  rejected: 'Rechazada',
}
