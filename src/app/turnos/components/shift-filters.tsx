'use client'

import { useRouter, useSearchParams } from 'next/navigation'

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
 */
export function ShiftFilters() {
  const router = useRouter()
  const params = useSearchParams()
  const date = (params.get('date') as DateFilter) || 'hoy'
  const slots = params.get('slots')

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params.toString())
    if (value === null) next.delete(key)
    else next.set(key, value)
    router.push(`/turnos?${next.toString()}`, { scroll: false })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {DATE_OPTIONS.map((o) => (
          <Chip
            key={o.value}
            active={date === o.value}
            onClick={() => setParam('date', o.value)}
          >
            {o.label}
          </Chip>
        ))}
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
