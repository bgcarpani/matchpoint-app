import { STATUS_LABELS } from '@/lib/domain/tournament'
import type { TournamentStatus } from '@/lib/types/database'
import { cn } from '@/lib/utils'

const STYLES: Record<TournamentStatus, string> = {
  draft: 'border border-border text-muted-foreground',
  published: 'border border-volt/40 text-volt',
  registration_open: 'bg-volt text-volt-foreground',
  registration_closed: 'bg-secondary text-secondary-foreground',
  in_progress: 'border border-volt/40 text-volt',
  finished: 'border border-border text-muted-foreground/70',
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
          'size-1.5 rounded-full',
          status === 'registration_open'
            ? 'animate-pulse bg-volt-foreground'
            : active
              ? 'animate-pulse bg-volt'
              : 'bg-current opacity-50'
        )}
        aria-hidden
      />
      {STATUS_LABELS[status]}
    </span>
  )
}
