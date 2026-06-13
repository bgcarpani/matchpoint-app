'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { PairStatus } from '@/lib/types/database'
import { PAIR_STATUS_LABELS } from '@/lib/domain/pair'
import {
  acceptPair,
  rejectPair,
  removePair,
} from '@/app/tournaments/[id]/registrations/actions'

export interface RegistrationPlayer {
  full_name: string
  email: string | null
  phone: string | null
  dni: string | null
}

export interface RegistrationRow {
  id: string
  status: PairStatus
  created_at: string
  player1: RegistrationPlayer
  player2: RegistrationPlayer
}

const STATUS_PILL: Record<PairStatus, string> = {
  pending: 'border border-border text-muted-foreground',
  accepted: 'bg-volt text-volt-foreground',
  rejected: 'border border-destructive/40 text-destructive',
}

// Orden de visualización: pendientes primero (lo accionable), luego aceptadas,
// por último rechazadas.
const STATUS_ORDER: Record<PairStatus, number> = {
  pending: 0,
  accepted: 1,
  rejected: 2,
}

type Filter = 'all' | PairStatus

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'accepted', label: 'Aceptadas' },
  { value: 'rejected', label: 'Rechazadas' },
]

export function RegistrationTable({
  rows,
  locked = false,
}: {
  rows: RegistrationRow[]
  locked?: boolean
}) {
  const [filter, setFilter] = useState<Filter>('all')

  const counts = useMemo(() => {
    const c = { all: rows.length, pending: 0, accepted: 0, rejected: 0 }
    for (const r of rows) c[r.status]++
    return c
  }, [rows])

  const visible = useMemo(() => {
    const filtered =
      filter === 'all' ? rows : rows.filter((r) => r.status === filter)
    return [...filtered].sort(
      (a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status]
    )
  }, [rows, filter])

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/30 p-10 text-center">
        <p className="text-foreground">Todavía no hay solicitudes.</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Las parejas que se inscriban desde la página pública van a aparecer
          acá.
        </p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.value
          return (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] transition-colors ${
                active
                  ? 'bg-volt text-volt-foreground'
                  : 'border border-border text-muted-foreground hover:text-foreground'
              }`}
            >
              {f.label}
              <span className={active ? 'opacity-80' : 'text-foreground/70'}>
                {counts[f.value]}
              </span>
            </button>
          )
        })}
      </div>

      {visible.length === 0 ? (
        <p className="mt-6 rounded-xl border border-dashed border-border bg-card/20 p-6 text-center text-sm text-muted-foreground">
          No hay solicitudes en este estado.
        </p>
      ) : (
        <ul className="mt-4 space-y-2">
          {visible.map((row) => (
            <RegistrationItem key={row.id} row={row} locked={locked} />
          ))}
        </ul>
      )}
    </div>
  )
}

function RegistrationItem({
  row,
  locked,
}: {
  row: RegistrationRow
  locked: boolean
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function run(
    action: () => Promise<{ error: string } | { ok: true }>,
    confirmMsg?: string
  ) {
    if (confirmMsg && !confirm(confirmMsg)) return
    setError(null)
    startTransition(async () => {
      const res = await action()
      if ('error' in res) {
        setError(res.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <li className="rounded-xl border border-border bg-card/40 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="grid flex-1 gap-x-6 gap-y-1 sm:grid-cols-2">
          <PlayerCell n={1} p={row.player1} />
          <PlayerCell n={2} p={row.player2} />
        </div>
        <span
          className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] ${STATUS_PILL[row.status]}`}
        >
          {PAIR_STATUS_LABELS[row.status]}
        </span>
      </div>

      {!locked && (
      <div className="mt-2.5 flex flex-wrap items-center gap-2">
        {row.status !== 'accepted' && (
          <ActionButton
            disabled={pending}
            onClick={() => run(() => acceptPair(row.id))}
            variant="primary"
          >
            Aceptar
          </ActionButton>
        )}
        {row.status === 'pending' && (
          <ActionButton
            disabled={pending}
            onClick={() =>
              run(() => rejectPair(row.id), '¿Rechazar esta solicitud?')
            }
          >
            Rechazar
          </ActionButton>
        )}
        {row.status !== 'pending' && (
          <ActionButton
            disabled={pending}
            onClick={() =>
              run(
                () => removePair(row.id),
                '¿Remover esta pareja? Se borran sus datos y no se puede deshacer.'
              )
            }
            variant="danger"
          >
            Remover
          </ActionButton>
        )}
        {error && <span className="text-sm text-destructive">{error}</span>}
      </div>
      )}
    </li>
  )
}

function PlayerCell({ n, p }: { n: number; p: RegistrationPlayer }) {
  const contact = [p.email, p.phone, p.dni && `DNI ${p.dni}`]
    .filter(Boolean)
    .join(' · ')
  return (
    <div className="min-w-0">
      <p className="truncate text-sm">
        <span className="font-display text-xs text-volt">{n}.</span>{' '}
        <span className="font-medium text-foreground">{p.full_name}</span>
      </p>
      {contact && (
        <p className="truncate text-xs text-muted-foreground">{contact}</p>
      )}
    </div>
  )
}

function ActionButton({
  children,
  onClick,
  disabled,
  variant = 'ghost',
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  variant?: 'primary' | 'danger' | 'ghost'
}) {
  const styles = {
    primary: 'bg-volt text-volt-foreground hover:brightness-105',
    danger:
      'border border-destructive/40 text-destructive hover:bg-destructive/10',
    ghost: 'border border-border text-foreground hover:bg-accent',
  }[variant]
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-50 ${styles}`}
    >
      {children}
    </button>
  )
}
