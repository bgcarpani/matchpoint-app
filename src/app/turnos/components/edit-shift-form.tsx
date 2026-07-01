'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Share2 } from 'lucide-react'
import type { ShiftStatus } from '@/lib/types/database'
import { shareWhatsappLink } from '@/lib/domain/shift'
import {
  updateShift,
  setShiftStatus,
  deleteShift,
} from '@/app/turnos/actions'
import { rememberShiftToken, forgetShiftToken } from '@/lib/shifts/storage'
import { useMounted } from '@/lib/shifts/hooks'
import { ShiftFields, toShiftInput, type ShiftFormState } from './shift-fields'

interface ShiftRow {
  id: string
  court_name: string
  start_time: string
  slots_needed: number
  category: string | null
  notes: string | null
  creator_name: string
  whatsapp: string
  instagram: string | null
  status: ShiftStatus
}

/** ISO → { date:'YYYY-MM-DD', time:'HH:mm' } en hora local (calculado en cliente). */
function isoToParts(iso: string): { date: string; time: string } {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}

export function EditShiftForm(props: {
  shift: ShiftRow
  token: string
  justCreated: boolean
}) {
  // Mount gate: la fecha/hora se derivan en hora local del cliente, así que el
  // form con estado se monta sólo en cliente (sin mismatch de zona horaria).
  const mounted = useMounted()
  if (!mounted) return <EditSkeleton />
  return <EditShiftFormInner {...props} />
}

function EditShiftFormInner({
  shift,
  token,
  justCreated,
}: {
  shift: ShiftRow
  token: string
  justCreated: boolean
}) {
  const router = useRouter()
  const [state, setState] = useState<ShiftFormState>(() => {
    const { date, time } = isoToParts(shift.start_time)
    return {
      court_name: shift.court_name,
      date,
      time,
      slots: shift.slots_needed as ShiftFormState['slots'],
      category: shift.category ?? '',
      notes: shift.notes ?? '',
      creator_name: shift.creator_name,
      whatsapp: shift.whatsapp,
      instagram: shift.instagram ?? '',
    }
  })
  const [status, setStatusState] = useState<ShiftStatus>(shift.status)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [pending, startTransition] = useTransition()

  // Guardamos el token en este dispositivo para el badge "Tuyo" (sin setState).
  useEffect(() => {
    rememberShiftToken(shift.id, token)
  }, [shift.id, token])

  function patch(p: Partial<ShiftFormState>) {
    setState((prev) => ({ ...prev, ...p }))
    setSaved(false)
  }

  function onSave(e: React.FormEvent) {
    e.preventDefault()
    const result = toShiftInput(state)
    if ('error' in result) {
      setError(result.error)
      return
    }
    setError(null)
    startTransition(async () => {
      const res = await updateShift(shift.id, token, result.input)
      if ('error' in res) {
        setError(res.error)
        return
      }
      setSaved(true)
    })
  }

  function changeStatus(next: ShiftStatus) {
    setError(null)
    startTransition(async () => {
      const res = await setShiftStatus(shift.id, token, next)
      if ('error' in res) {
        setError(res.error)
        return
      }
      if (next === 'closed') {
        router.push('/turnos')
        return
      }
      setStatusState(next)
    })
  }

  function onShare() {
    const start = new Date(`${state.date}T${state.time}`)
    const shareShift = {
      ...shift,
      court_name: state.court_name,
      start_time: Number.isNaN(start.getTime())
        ? shift.start_time
        : start.toISOString(),
      slots_needed: state.slots,
      category: state.category.trim() || null,
      creator_name: state.creator_name,
    }
    window.open(
      shareWhatsappLink(shareShift, `${window.location.origin}/turnos`),
      '_blank',
      'noopener,noreferrer'
    )
  }

  function onDelete() {
    if (
      !window.confirm(
        '¿Eliminar el turno? Esta acción no se puede deshacer.'
      )
    )
      return
    setError(null)
    startTransition(async () => {
      const res = await deleteShift(shift.id, token)
      if ('error' in res) {
        setError(res.error)
        return
      }
      forgetShiftToken(shift.id)
      router.push('/turnos')
    })
  }

  return (
    <div>
      {justCreated && (
        <div className="elevate mb-6 rounded-2xl border border-volt/30 bg-volt/5 p-5">
          <p className="font-display text-lg text-foreground">
            ¡Turno publicado!
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ya aparece en el tablero. Compartilo en tu grupo de WhatsApp para
            que se sumen; guardá esta página para volver a editarlo.
          </p>
          <button
            type="button"
            onClick={onShare}
            className="font-display mt-4 inline-flex items-center gap-2 rounded-lg bg-volt px-4 py-2.5 text-sm text-volt-foreground transition-transform active:scale-[0.98] hover:brightness-105"
          >
            <Share2 className="size-4" />
            Compartir en WhatsApp
          </button>
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-3xl text-foreground sm:text-4xl">
          Gestionar turno
        </h1>
        <StatusBadge status={status} />
      </div>

      <form
        onSubmit={onSave}
        className="elevate mt-8 rounded-2xl border border-border bg-card p-6 sm:p-8"
      >
        <ShiftFields state={state} onChange={patch} />

        {error && (
          <p className="mt-5 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {saved && !error && (
          <p className="mt-5 flex items-center justify-between gap-3 rounded-md border border-volt/40 bg-volt/10 px-3 py-2 text-sm text-foreground">
            <span>Turno actualizado.</span>
            <a href="/turnos" className="font-medium text-volt hover:underline">
              Volver al tablero →
            </a>
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="font-display mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-volt px-5 py-3.5 text-base text-volt-foreground transition-transform active:scale-[0.98] hover:brightness-105 disabled:opacity-60"
        >
          {pending ? 'Guardando…' : 'Guardar cambios'}
        </button>
      </form>

      {/* Acciones de estado */}
      <div className="mt-6 space-y-3">
        <button
          type="button"
          onClick={onShare}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-volt/40 bg-volt/10 px-4 py-3 text-sm font-medium text-volt transition-colors hover:bg-volt/15"
        >
          <Share2 className="size-4" />
          Compartir en WhatsApp
        </button>
        {status === 'full' ? (
          <ActionButton onClick={() => changeStatus('open')} disabled={pending}>
            Reabrir turno
          </ActionButton>
        ) : (
          <ActionButton onClick={() => changeStatus('full')} disabled={pending}>
            Marcar como completo
          </ActionButton>
        )}
        <ActionButton onClick={() => changeStatus('closed')} disabled={pending}>
          Cerrar turno (lo saca del tablero)
        </ActionButton>
        <ActionButton onClick={onDelete} disabled={pending} destructive>
          Eliminar turno
        </ActionButton>
      </div>
    </div>
  )
}

function ActionButton({
  children,
  onClick,
  disabled,
  destructive,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  destructive?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full rounded-lg border px-4 py-3 text-sm font-medium transition-colors disabled:opacity-50 ${
        destructive
          ? 'border-destructive/40 text-destructive hover:bg-destructive/10'
          : 'border-border text-foreground hover:border-volt/50'
      }`}
    >
      {children}
    </button>
  )
}

function EditSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-10 w-56 animate-pulse rounded-lg bg-card" />
      <div className="elevate h-[560px] animate-pulse rounded-2xl border border-border bg-card" />
    </div>
  )
}

function StatusBadge({ status }: { status: ShiftStatus }) {
  const map: Record<ShiftStatus, { label: string; className: string }> = {
    open: {
      label: 'Abierto',
      className: 'bg-volt text-volt-foreground',
    },
    full: {
      label: 'Completo',
      className: 'bg-muted text-muted-foreground',
    },
    closed: {
      label: 'Cerrado',
      className: 'border border-border text-muted-foreground',
    },
  }
  const s = map[status]
  return (
    <span
      className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ${s.className}`}
    >
      {s.label}
    </span>
  )
}
