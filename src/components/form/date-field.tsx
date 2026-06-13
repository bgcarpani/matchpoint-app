'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
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

const PANEL_WIDTH = 288 // ancho aprox del calendario, para clampear al viewport

/**
 * Campo de fecha con calendario visual. El panel se monta vía portal directo a
 * `document.body` con `position: fixed` y z-index alto: así no queda detrás de
 * otros controles ni pierde los clicks (problema que tenía el Popover de base-ui).
 * Maneja un valor controlado 'YYYY-MM-DD' | '' — estado local (no RHF), igual que
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
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const selected = value ? new Date(`${value}T00:00:00`) : undefined

  // Posicionamiento imperativo: escribimos top/left en el nodo del panel sin
  // pasar por estado (el React Compiler prohíbe setState síncrono en effects).
  const place = useCallback(() => {
    const el = triggerRef.current
    const panel = panelRef.current
    if (!el || !panel) return
    const r = el.getBoundingClientRect()
    const maxLeft = window.innerWidth - PANEL_WIDTH - 8
    const left = Math.max(8, Math.min(r.left, maxLeft))
    // Si no entra abajo, lo abrimos hacia arriba.
    const below = r.bottom + 8
    const wantsAbove = below + 340 > window.innerHeight
    const top = wantsAbove ? Math.max(8, r.top - 340) : below
    panel.style.top = `${top}px`
    panel.style.left = `${left}px`
    panel.style.visibility = 'visible'
  }, [])

  // Posicionar al abrir y mantener pegado al trigger en scroll/resize.
  useEffect(() => {
    if (!open) return
    place()
    const onMove = () => place()
    window.addEventListener('resize', onMove)
    window.addEventListener('scroll', onMove, true)
    return () => {
      window.removeEventListener('resize', onMove)
      window.removeEventListener('scroll', onMove, true)
    }
  }, [open, place])

  // Cerrar con Escape o click afuera.
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    function onDown(e: MouseEvent) {
      const t = e.target as Node
      if (panelRef.current?.contains(t) || triggerRef.current?.contains(t)) return
      setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [open])

  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <button
        ref={triggerRef}
        type="button"
        className={triggerClass}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={value ? 'text-foreground' : 'text-muted-foreground'}>
          {value ? formatDate(value) : placeholder}
        </span>
        <CalendarDays className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={panelRef}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              zIndex: 100,
              visibility: 'hidden',
            }}
            className="rounded-xl border border-border bg-popover p-3 text-popover-foreground shadow-2xl outline-none"
          >
            <Calendar
              selected={selected}
              fromToday={fromToday}
              onSelect={(d) => {
                onChange(d ? toYMD(d) : '')
                setOpen(false)
              }}
            />
          </div>,
          document.body
        )}

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
