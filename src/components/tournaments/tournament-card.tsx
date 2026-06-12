import Link from 'next/link'
import { TournamentStatusBadge } from './tournament-status-badge'
import { categoryLabel, GENDER_LABELS } from '@/lib/domain/tournament'
import { formatDate } from '@/lib/format'
import type { Tournament } from '@/lib/types/database'

export function TournamentCard({ tournament: t }: { tournament: Tournament }) {
  return (
    <Link
      href={`/tournaments/${t.id}`}
      className="group block rounded-2xl border border-border bg-card/40 p-6 transition-colors hover:border-volt/40 hover:bg-card/70"
    >
      <div className="flex items-start justify-between gap-3">
        <TournamentStatusBadge status={t.status} />
        <span className="text-xs text-muted-foreground tnum">
          {formatDate(t.tournament_date)}
        </span>
      </div>

      <h3 className="font-display mt-4 text-2xl text-foreground">{t.name}</h3>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-md bg-volt/10 px-2 py-0.5 text-volt ring-1 ring-volt/30">
          {categoryLabel(t.category_type, t.category_value)}
        </span>
        <span className="rounded-md bg-secondary px-2 py-0.5 text-muted-foreground">
          {GENDER_LABELS[t.gender]}
        </span>
        <span className="ml-auto text-xs text-muted-foreground tnum">
          {t.max_pairs} parejas
        </span>
      </div>
    </Link>
  )
}
