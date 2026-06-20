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
}: {
  status: TournamentStatus
  className?: string
}) {
  const active = status === 'registration_open' || status === 'in_progress'
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]',
        STYLES[status],
        className
      )}
    >
      <span
        className={cn(
          'size-1.5 rounded-full bg-current',
          active ? 'animate-pulse' : 'opacity-50'
        )}
        aria-hidden
      />
      {STATUS_LABELS[status]}
    </span>
  )
}
