'use client'

import { useState, useTransition } from 'react'
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

export function RegistrationTable({ rows }: { rows: RegistrationRow[] }) {
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
    <ul className="space-y-3">
      {rows.map((row) => (
        <RegistrationItem key={row.id} row={row} />
      ))}
    </ul>
  )
}

function RegistrationItem({ row }: { row: RegistrationRow }) {
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
    <li className="rounded-2xl border border-border bg-card/40 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid flex-1 gap-3 sm:grid-cols-2">
          <PlayerCell n={1} p={row.player1} />
          <PlayerCell n={2} p={row.player2} />
        </div>
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${STATUS_PILL[row.status]}`}
        >
          {PAIR_STATUS_LABELS[row.status]}
        </span>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
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
    </li>
  )
}

function PlayerCell({ n, p }: { n: number; p: RegistrationPlayer }) {
  const contact = [p.email, p.phone].filter(Boolean).join(' · ')
  return (
    <div>
      <p className="font-display text-xs text-volt">Jugador {n}</p>
      <p className="mt-1 text-sm font-medium text-foreground">{p.full_name}</p>
      {contact && (
        <p className="mt-0.5 text-xs text-muted-foreground">{contact}</p>
      )}
      {p.dni && (
        <p className="text-xs text-muted-foreground">DNI {p.dni}</p>
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
      className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors disabled:opacity-50 ${styles}`}
    >
      {children}
    </button>
  )
}
