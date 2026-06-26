'use client'

import { useMemo, useState } from 'react'
import { TournamentTable, type TournamentRow } from './tournament-table'
import { STATUS_LABELS, TOURNAMENT_LIFECYCLE } from '@/lib/domain/tournament'
import type { TournamentStatus } from '@/lib/types/database'
import { cn } from '@/lib/utils'

type SortKey = 'date' | 'status'
type SortDir = 'asc' | 'desc'
type StatusFilter = TournamentStatus | 'all'

/** Posición de cada estado en el ciclo de vida, para ordenar por estado. */
const STATUS_ORDER = new Map(TOURNAMENT_LIFECYCLE.map((s, i) => [s, i]))

/**
 * Listado interactivo de torneos del panel: filtra por estado y ordena por fecha
 * de torneo o por estado. Todo client-side sobre las filas que ya trae el server
 * (el panel no pagina). Envuelve a `TournamentTable`, que sigue siendo la planilla.
 */
export function TournamentBrowser({
  tournaments,
}: {
  tournaments: TournamentRow[]
}) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [sortKey, setSortKey] = useState<SortKey>('date')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  // Estados presentes en los datos, en orden de ciclo de vida, para no mostrar
  // chips de filtros que no aplican a ningún torneo del organizador.
  const presentStatuses = useMemo(() => {
    const set = new Set(tournaments.map((t) => t.status))
    return TOURNAMENT_LIFECYCLE.filter((s) => set.has(s))
  }, [tournaments])

  const visible = useMemo(() => {
    const filtered =
      statusFilter === 'all'
        ? tournaments
        : tournaments.filter((t) => t.status === statusFilter)

    const dir = sortDir === 'asc' ? 1 : -1
    return [...filtered].sort((a, b) => {
      if (sortKey === 'status') {
        const diff =
          (STATUS_ORDER.get(a.status) ?? 0) - (STATUS_ORDER.get(b.status) ?? 0)
        // Empate de estado → desempata por fecha más próxima primero.
        if (diff !== 0) return diff * dir
        return a.tournament_date.localeCompare(b.tournament_date) * -1
      }
      // Fecha: el formato ISO 'YYYY-MM-DD' ordena lexicográficamente.
      return a.tournament_date.localeCompare(b.tournament_date) * dir
    })
  }, [tournaments, statusFilter, sortKey, sortDir])

  // Al re-tocar el criterio activo se invierte la dirección; al cambiar de
  // criterio se arranca ascendente (fecha: más próxima primero; estado: por
  // orden de ciclo de vida).
  function pickSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  return (
    <div>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Filtro por estado */}
        <div className="flex flex-wrap items-center gap-1.5">
          <FilterChip
            active={statusFilter === 'all'}
            onClick={() => setStatusFilter('all')}
          >
            Todos
          </FilterChip>
          {presentStatuses.map((s) => (
            <FilterChip
              key={s}
              active={statusFilter === s}
              onClick={() => setStatusFilter(s)}
            >
              {STATUS_LABELS[s]}
            </FilterChip>
          ))}
        </div>

        {/* Ordenar por */}
        <div className="flex items-center gap-1.5">
          <span className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Ordenar
          </span>
          <SortButton
            active={sortKey === 'date'}
            dir={sortDir}
            onClick={() => pickSort('date')}
          >
            Fecha
          </SortButton>
          <SortButton
            active={sortKey === 'status'}
            dir={sortDir}
            onClick={() => pickSort('status')}
          >
            Estado
          </SortButton>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No hay torneos con ese estado.
        </div>
      ) : (
        <TournamentTable tournaments={visible} />
      )}
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] transition-colors',
        active
          ? 'border-transparent bg-[color:var(--volt)] text-[color:var(--primary-foreground)]'
          : 'border-border bg-card text-muted-foreground hover:bg-[color:var(--volt-surface)] hover:text-foreground'
      )}
    >
      {children}
    </button>
  )
}

function SortButton({
  active,
  dir,
  onClick,
  children,
}: {
  active: boolean
  dir: SortDir
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] transition-colors',
        active
          ? 'border-transparent bg-[color:var(--volt-tint)] text-[color:var(--volt-deep)]'
          : 'border-border bg-card text-muted-foreground hover:bg-[color:var(--volt-surface)] hover:text-foreground'
      )}
    >
      {children}
      {active && (
        <span className="font-mono text-[0.7rem] leading-none" aria-hidden>
          {dir === 'asc' ? '↑' : '↓'}
        </span>
      )}
    </button>
  )
}
