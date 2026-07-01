'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createShift } from '@/app/turnos/actions'
import { rememberShiftToken, LAST_WHATSAPP_KEY } from '@/lib/shifts/storage'
import { useMounted } from '@/lib/shifts/hooks'
import {
  ShiftFields,
  emptyShiftState,
  toShiftInput,
  nextRoundHour,
  todayYMD,
  type ShiftFormState,
} from './shift-fields'

/**
 * Formulario de creación de turno. Se monta sólo en cliente (mount gate) para que
 * el lazy initializer pueda leer defaults inteligentes (hoy + próxima hora redonda
 * + último WhatsApp) sin mismatch de hidratación ni setState en efectos.
 */
export function NewShiftForm() {
  const mounted = useMounted()
  if (!mounted) return <FormSkeleton />
  return <NewShiftFormInner />
}

function NewShiftFormInner() {
  const router = useRouter()
  const [state, setState] = useState<ShiftFormState>(() => ({
    ...emptyShiftState,
    date: todayYMD(),
    time: nextRoundHour(),
    whatsapp: window.localStorage.getItem(LAST_WHATSAPP_KEY) ?? '',
  }))
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function patch(p: Partial<ShiftFormState>) {
    setState((prev) => ({ ...prev, ...p }))
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const result = toShiftInput(state)
    if ('error' in result) {
      setError(result.error)
      return
    }
    setError(null)
    startTransition(async () => {
      const res = await createShift(result.input)
      if ('error' in res) {
        setError(res.error)
        return
      }
      rememberShiftToken(res.id, res.manage_token, result.input.whatsapp)
      router.push(`/turnos/${res.id}/editar?token=${res.manage_token}&nuevo=1`)
    })
  }

  return (
    <form
      onSubmit={onSubmit}
      className="elevate rounded-2xl border border-border bg-card p-6 sm:p-8"
    >
      <ShiftFields state={state} onChange={patch} />

      {error && (
        <p className="mt-5 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="font-display mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-volt px-5 py-3.5 text-base text-volt-foreground transition-transform active:scale-[0.98] hover:brightness-105 disabled:opacity-60"
      >
        {pending ? 'Publicando…' : 'Publicar turno →'}
      </button>
    </form>
  )
}

function FormSkeleton() {
  return (
    <div className="elevate h-[520px] animate-pulse rounded-2xl border border-border bg-card" />
  )
}
