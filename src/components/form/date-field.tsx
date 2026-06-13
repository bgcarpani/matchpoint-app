'use client'

import { useState } from 'react'
import { Popover } from '@base-ui/react/popover'
import { CalendarDays } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { formatDate } from '@/lib/format'

/** Date local → 'YYYY-MM-DD' (sin desfase de zona horaria). */
function toYMD(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

const triggerClass =
  'mt-2 flex w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none transition-colors hover:border-volt/50 focus:border-volt focus:ring-1 focus:ring-volt'

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </span>
  )
}

/**
 * Campo de fecha con calendario visual (popover). Maneja un valor controlado
 * 'YYYY-MM-DD' | '' — pensado para estado local en el form (no RHF), igual que
 * el CategorySelector, para no chocar con el React Compiler.
 */
export function DateField({
  label,
  value,
  onChange,
  error,
  placeholder = 'Elegí una fecha',
  fromToday,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  placeholder?: string
  fromToday?: boolean
}) {
  const [open, setOpen] = useState(false)
  const selected = value ? new Date(`${value}T00:00:00`) : undefined

  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger render={<button type="button" />} className={triggerClass}>
          <span className={value ? 'text-foreground' : 'text-muted-foreground'}>
            {value ? formatDate(value) : placeholder}
          </span>
          <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Positioner sideOffset={8} align="start">
            <Popover.Popup className="z-50 rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-2xl outline-none">
              <Calendar
                selected={selected}
                fromToday={fromToday}
                onSelect={(d) => {
                  onChange(d ? toYMD(d) : '')
                  setOpen(false)
                }}
              />
            </Popover.Popup>
          </Popover.Positioner>
        </Popover.Portal>
      </Popover.Root>
      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
    </div>
  )
}

/**
 * Campo de fecha + hora (para apertura automática de inscripción). Combina el
 * calendario con un input de hora nativo. Valor controlado 'YYYY-MM-DDTHH:mm' | ''.
 * Si se limpia la fecha, el valor queda vacío (apertura manual).
 */
export function DateTimeField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  hint?: string
}) {
  const [datePart, timePart] = value ? value.split('T') : ['', '']

  function setDate(ymd: string) {
    if (!ymd) {
      onChange('')
      return
    }
    onChange(`${ymd}T${timePart || '09:00'}`)
  }

  function setTime(t: string) {
    if (!datePart) return
    onChange(`${datePart}T${t || '09:00'}`)
  }

  return (
    <div>
      <div className="grid grid-cols-[1fr_auto] items-end gap-3">
        <DateField
          label={label}
          value={datePart}
          onChange={setDate}
          placeholder="Sin apertura automática"
          fromToday
        />
        <div>
          <FieldLabel>Hora</FieldLabel>
          <input
            type="time"
            value={timePart}
            disabled={!datePart}
            onChange={(e) => setTime(e.target.value)}
            className="mt-2 rounded-lg border border-input bg-background px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-volt focus:ring-1 focus:ring-volt disabled:opacity-40"
          />
        </div>
      </div>
      {hint && <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
