'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Clock } from 'lucide-react'

const triggerClass =
  'mt-2 flex w-full items-center justify-between gap-2 rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none transition-colors hover:border-volt/50 focus:border-volt focus:ring-1 focus:ring-volt'

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </span>
  )
}

const pad = (n: number) => String(n).padStart(2, '0')

/** Franjas de 30 min entre `from` y `to` (inclusive), formato 'HH:mm'. */
function buildSlots(from = 6, to = 23): string[] {
  const out: string[] = []
  for (let h = from; h <= to; h++) {
    out.push(`${pad(h)}:00`)
    out.push(`${pad(h)}:30`)
  }
  return out
}

const PANEL_WIDTH = 150
const PANEL_HEIGHT = 264

/**
 * Selector de hora con lista de franjas de 30 min (la granularidad típica de un
 * turno de pádel), mucho más cómodo que el spinner nativo de `input[type=time]`.
 * Panel montado por portal a `document.body` con `position: fixed` — mismo patrón
 * que `DateField` para no quedar detrás de otros controles. Valor controlado
 * 'HH:mm' | '' con estado local (no RHF, por el React Compiler). Si el valor no
 * cae en una franja (ej. al editar un turno de 15:45) se inserta igual en la lista.
 */
export function TimeField({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const slots = buildSlots()
  if (value && !slots.includes(value)) {
    slots.push(value)
    slots.sort()
  }

  const place = useCallback(() => {
    const el = triggerRef.current
    const panel = panelRef.current
    if (!el || !panel) return
    const r = el.getBoundingClientRect()
    const maxLeft = window.innerWidth - PANEL_WIDTH - 8
    const left = Math.max(8, Math.min(r.left, maxLeft))
    const below = r.bottom + 8
    const wantsAbove = below + PANEL_HEIGHT > window.innerHeight
    const top = wantsAbove ? Math.max(8, r.top - PANEL_HEIGHT - 8) : below
    panel.style.top = `${top}px`
    panel.style.left = `${left}px`
    panel.style.width = `${PANEL_WIDTH}px`
    panel.style.visibility = 'visible'
  }, [])

  useEffect(() => {
    if (!open) return
    place()
    // Centrar la franja seleccionada en la lista al abrir.
    panelRef.current
      ?.querySelector('[data-selected="true"]')
      ?.scrollIntoView({ block: 'center' })
    const onMove = () => place()
    window.addEventListener('resize', onMove)
    window.addEventListener('scroll', onMove, true)
    return () => {
      window.removeEventListener('resize', onMove)
      window.removeEventListener('scroll', onMove, true)
    }
  }, [open, place])

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
        disabled={disabled}
        className={`${triggerClass} disabled:opacity-40`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className={value ? 'text-foreground tnum' : 'text-muted-foreground'}>
          {value || 'Hora'}
        </span>
        <Clock className="size-4 shrink-0 text-muted-foreground" />
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
              maxHeight: PANEL_HEIGHT,
              zIndex: 100,
              visibility: 'hidden',
            }}
            className="overflow-y-auto rounded-xl border border-border bg-popover p-1 text-popover-foreground shadow-2xl outline-none"
          >
            {slots.map((t) => {
              const active = t === value
              return (
                <button
                  key={t}
                  type="button"
                  data-selected={active}
                  onClick={() => {
                    onChange(t)
                    setOpen(false)
                  }}
                  className={`tnum block w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors ${
                    active
                      ? 'bg-volt text-volt-foreground'
                      : 'text-foreground hover:bg-secondary'
                  }`}
                >
                  {t}
                </button>
              )
            })}
          </div>,
          document.body
        )}
    </div>
  )
}
