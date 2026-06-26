import Link from 'next/link'
import { TournamentStatusBadge } from './tournament-status-badge'
import { categoryLabel, GENDER_LABELS } from '@/lib/domain/tournament'
import { formatDate } from '@/lib/format'
import type { Tournament } from '@/lib/types/database'

export interface TournamentRow extends Tournament {
  /** Parejas aceptadas (confirmadas) en el torneo. */
  acceptedCount: number
}

/**
 * Listado denso de torneos del organizer (estilo planilla de marcador): una fila
 * por torneo con estado, parejas (número mono) y fecha. Reemplaza la grilla de
 * tarjetas; en mobile las columnas se pliegan a una segunda línea de subtítulo.
 */
export function TournamentTable({ tournaments }: { tournaments: TournamentRow[] }) {
  return (
    <div className="elevate overflow-hidden rounded-xl border border-border bg-card">
      {/* Encabezado de columnas (sólo desktop) */}
      <div className="hidden grid-cols-[minmax(0,1fr)_132px_80px_96px] items-center gap-4 border-b border-border px-4 py-2.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground sm:grid">
        <span>Torneo</span>
        <span>Estado</span>
        <span className="text-center">Parejas</span>
        <span className="text-right">Fecha</span>
      </div>

      <ul className="divide-y divide-border">
        {tournaments.map((t) => (
          <li key={t.id}>
            <Link
              href={`/tournaments/${t.id}`}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-3 transition-colors hover:bg-[color:var(--volt-surface)] sm:grid-cols-[minmax(0,1fr)_132px_80px_96px]"
            >
              {/* Nombre + subtítulo */}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  {t.name}
                </p>
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {categoryLabel(t.category_type, t.category_value)} ·{' '}
                  {GENDER_LABELS[t.gender]}
                  <span className="sm:hidden">
                    {' · '}
                    <span className="font-mono tnum font-semibold text-foreground">
                      {t.acceptedCount}
                    </span>{' '}
                    parejas · <span className="tnum">{formatDate(t.tournament_date)}</span>
                  </span>
                </p>
              </div>

              {/* Estado */}
              <div className="justify-self-end sm:justify-self-start">
                <TournamentStatusBadge status={t.status} compact />
              </div>

              {/* Parejas (desktop) */}
              <span className="hidden text-center font-mono tnum text-sm font-bold text-foreground sm:block">
                {t.acceptedCount}
                <span className="text-muted-foreground">/{t.max_pairs}</span>
              </span>

              {/* Fecha (desktop) */}
              <span className="hidden text-right font-mono tnum text-xs text-muted-foreground sm:block">
                {formatDate(t.tournament_date)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
