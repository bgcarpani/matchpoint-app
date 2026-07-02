'use client'

import { useState, useTransition } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Spinner } from '@/components/ui/spinner'

export type DateFilter = 'hoy' | 'manana' | 'semana'

const DATE_OPTIONS: { value: DateFilter; label: string }[] = [
  { value: 'hoy', label: 'Hoy' },
  { value: 'manana', label: 'Mañana' },
  { value: 'semana', label: 'Esta semana' },
]

const SLOT_OPTIONS = ['1', '2', '3', '4']

/**
 * Filtros del tablero como chips que reescriben los query params (`?date=&slots=`).
 * El server component re-consulta con los nuevos filtros. `date` default 'hoy';
 * `slots` es opcional (toggle: volver a clickear el activo lo limpia).
 *
 * La navegación va dentro de una transición: el chip clickeado se marca activo
 * al instante (params optimistas locales) y un spinner indica que el tablero
 * se está actualizando, en vez de dejar la UI congelada durante el round-trip.
 */
export function ShiftFilters() {
  const router = useRouter()
  const realParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [optimistic, setOptimistic] = useState<URLSearchParams | null>(null)

  // Mientras la transición está en vuelo mostramos los params optimistas;
  // al completarse (isPending=false) volvemos a la URL real.
  const params = isPending && optimistic ? optimistic : realParams
  const date = (params.get('date') as DateFilter) || 'hoy'
  const slots = params.get('slots')

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(realParams.toString())
    if (value === null) next.delete(key)
    else next.set(key, value)
    setOptimistic(next)
    startTransition(() => {
      router.push(`/turnos?${next.toString()}`, { scroll: false })
    })
  }

  return (
    <div className="flex flex-col gap-3" aria-busy={isPending}>
      <div className="flex flex-wrap items-center gap-2">
        {DATE_OPTIONS.map((o) => (
          <Chip
            key={o.value}
            active={date === o.value}
            onClick={() => setParam('date', o.value)}
          >
            {o.label}
          </Chip>
        ))}
        {isPending && <Spinner className="ml-1 size-4 text-volt" />}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-muted-foreground">
          Faltan
        </span>
        {SLOT_OPTIONS.map((s) => (
          <Chip
            key={s}
            active={slots === s}
            onClick={() => setParam('slots', slots === s ? null : s)}
          >
            {s}
          </Chip>
        ))}
      </div>
    </div>
  )
}

function Chip({
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
      aria-pressed={active}
      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
        active
          ? 'bg-volt text-volt-foreground'
          : 'border border-border text-muted-foreground hover:text-foreground'
      }`}
    >
      {children}
    </button>
  )
}
