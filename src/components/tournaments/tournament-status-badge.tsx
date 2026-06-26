import { STATUS_LABELS } from '@/lib/domain/tournament'
import type { TournamentStatus } from '@/lib/types/database'
import { cn } from '@/lib/utils'

const STYLES: Record<TournamentStatus, string> = {
  draft: 'bg-secondary text-muted-foreground',
  published: 'bg-[color:var(--volt-tint)] text-[color:var(--volt-deep)]',
  registration_open:
    'bg-[color:var(--success-tint)] text-[color:var(--success-deep)]',
  registration_closed: 'bg-secondary text-secondary-foreground',
  in_progress: 'bg-[color:var(--volt-tint)] text-[color:var(--volt-deep)]',
  finished: 'bg-secondary text-muted-foreground/80',
}

export function TournamentStatusBadge({
  status,
  className,
  compact = false,
}: {
  status: TournamentStatus
  className?: string
  /**
   * En el listado del panel el estado convive con el nombre del torneo en una
   * fila angosta; en mobile el sello se achica (texto/padding/tracking menores)
   * para no comerse el texto de descripción. En ≥sm vuelve al tamaño normal.
   */
  compact?: boolean
}) {
  const active = status === 'registration_open' || status === 'in_progress'
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold uppercase',
        compact
          ? 'gap-1 px-2 py-0.5 text-[0.6rem] tracking-[0.06em] sm:gap-2 sm:px-3 sm:py-1 sm:text-xs sm:tracking-[0.12em]'
          : 'gap-2 px-3 py-1 text-xs tracking-[0.12em]',
        STYLES[status],
        className
      )}
    >
      <span
        className={cn(
          'rounded-full bg-current',
          compact ? 'size-1 sm:size-1.5' : 'size-1.5',
          active ? 'animate-pulse' : 'opacity-50'
        )}
        aria-hidden
      />
      {STATUS_LABELS[status]}
    </span>
  )
}
