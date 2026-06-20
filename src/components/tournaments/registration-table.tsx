'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { PairStatus } from '@/lib/types/database'
import { PAIR_STATUS_LABELS } from '@/lib/domain/pair'
import { depositWhatsappText, toWhatsappNumber } from '@/lib/share/messages'
import {
  acceptPair,
  rejectPair,
  removePair,
  markDepositPaid,
  unmarkDepositPaid,
  notifyAcceptedByEmail,
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
  lookup_token: string
  deposit_paid_at: string | null
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

// "deposit_pending" no es un status: son las aceptadas sin seña (accepted &&
// deposit_paid_at == null). Permite ver de un vistazo quién debe la seña.
type Filter = 'all' | PairStatus | 'deposit_pending'

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'pending', label: 'Pendientes' },
  { value: 'accepted', label: 'Aceptadas' },
  { value: 'deposit_pending', label: 'Pendiente de seña' },
  { value: 'rejected', label: 'Rechazadas' },
]

const isDepositPending = (r: RegistrationRow) =>
  r.status === 'accepted' && !r.deposit_paid_at

export function RegistrationTable({
  rows,
  tournamentName,
  baseUrl,
  locked = false,
}: {
  rows: RegistrationRow[]
  tournamentName: string
  baseUrl: string
  locked?: boolean
}) {
  const [filter, setFilter] = useState<Filter>('all')

  const counts = useMemo(() => {
    const c = {
      all: rows.length,
      pending: 0,
      accepted: 0,
      rejected: 0,
      deposit_pending: 0,
    }
    for (const r of rows) {
      c[r.status]++
      if (isDepositPending(r)) c.deposit_pending++
    }
    return c
  }, [rows])

  const visible = useMemo(() => {
    const filtered =
      filter === 'all'
        ? rows
        : filter === 'deposit_pending'
          ? rows.filter(isDepositPending)
          : rows.filter((r) => r.status === filter)
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
            <RegistrationItem
              key={row.id}
              row={row}
              tournamentName={tournamentName}
              baseUrl={baseUrl}
              locked={locked}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function RegistrationItem({
  row,
  tournamentName,
  baseUrl,
  locked,
}: {
  row: RegistrationRow
  tournamentName: string
  baseUrl: string
  locked: boolean
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [emailSent, setEmailSent] = useState(false)
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

  // Aviso por email manual (Slice 6): muestra "Enviado" sin refrescar la tabla.
  function sendEmailNotice() {
    setError(null)
    startTransition(async () => {
      const res = await notifyAcceptedByEmail(row.id)
      if ('error' in res) {
        setError(res.error)
        return
      }
      setEmailSent(true)
    })
  }

  const accepted = row.status === 'accepted'
  const depositPaid = accepted && !!row.deposit_paid_at

  // Aviso de WhatsApp: mismo copy que el email; dirigido al J1 si tiene teléfono.
  const trackUrl = `${baseUrl}/inscription/${row.lookup_token}`
  const waNumber = toWhatsappNumber(row.player1.phone)
  const waText = depositWhatsappText({
    playerName: row.player1.full_name,
    tournamentName,
    trackUrl,
  })
  const waHref = `https://wa.me/${waNumber ?? ''}?text=${encodeURIComponent(waText)}`

  return (
    <li className="rounded-xl border border-border bg-card/40 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="grid flex-1 gap-x-6 gap-y-1 sm:grid-cols-2">
          <PlayerCell n={1} p={row.player1} />
          <PlayerCell n={2} p={row.player2} />
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {accepted && (
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] ${
                depositPaid
                  ? 'border border-[color:var(--success)]/40 text-[color:var(--success)]'
                  : 'border border-[color:var(--warning)]/40 text-[color:var(--warning)]'
              }`}
            >
              {depositPaid ? 'Seña recibida' : 'Pendiente de seña'}
            </span>
          )}
          <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.12em] ${STATUS_PILL[row.status]}`}
          >
            {PAIR_STATUS_LABELS[row.status]}
          </span>
        </div>
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

        {accepted && (
          <>
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-[#25D366]/40 bg-[#25D366]/10 px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-[#25D366]/20"
            >
              Avisar por WhatsApp
            </a>
            {row.player1.email && (
              <ActionButton
                disabled={pending || emailSent}
                onClick={sendEmailNotice}
              >
                {emailSent ? 'Email enviado' : 'Avisar por email'}
              </ActionButton>
            )}
            {depositPaid ? (
              <ActionButton
                disabled={pending}
                onClick={() => run(() => unmarkDepositPaid(row.id))}
              >
                Deshacer seña
              </ActionButton>
            ) : (
              <ActionButton
                disabled={pending}
                onClick={() => run(() => markDepositPaid(row.id))}
                variant="primary"
              >
                Seña recibida
              </ActionButton>
            )}
          </>
        )}

        {/* Rechazar: en pending (alta) y en accepted (rechazo por falta de pago). */}
        {row.status !== 'rejected' && (
          <ActionButton
            disabled={pending}
            onClick={() =>
              run(
                () => rejectPair(row.id),
                accepted
                  ? '¿Rechazar esta pareja por falta de pago?'
                  : '¿Rechazar esta solicitud?'
              )
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
