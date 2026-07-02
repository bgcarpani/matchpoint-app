'use client'

import { useState } from 'react'
import type { CalendarStyle } from '@/lib/og/calendar-story'

/**
 * Flujo de compartir el afiche de difusión del CALENDARIO en DOS pasos (espejo de
 * `TournamentStoryShare`):
 *  1. El botón "Compartir en historia" abre el selector de diseño.
 *  2. El organizer elige el estilo (ve la vista previa real del PNG) y recién ahí
 *     comparte. El estilo elegido (`?style=`) llega siempre al PNG compartido.
 *
 * La generación/compartido es igual que `ShareButtons` (Web Share Level 2 en
 * mobile; descarga + abrir Instagram en desktop) pero acá la URL lleva el estilo.
 */
const STYLES: { value: CalendarStyle; label: string }[] = [
  { value: 'a', label: 'Afiche' },
  { value: 'b', label: 'Marcador' },
  { value: 'c', label: 'Ficha' },
  { value: 'd', label: 'Mes' },
]

/** 'YYYY-MM' → 'Julio 2026' (es-AR, inicial mayúscula). */
function monthLabelOf(ym: string): string {
  const [y, m] = ym.split('-').map(Number)
  const name = new Intl.DateTimeFormat('es-AR', {
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, 1)))
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${y}`
}

export function CalendarStoryShare({
  storyUrl,
  url,
  text,
  months = [],
}: {
  /** Ruta base `/og/story` (sin query); se le agrega `?style=`. */
  storyUrl: string
  /** URL pública del calendario (para copiar al portapapeles / sticker de Enlace). */
  url: string
  /** Texto de acompañamiento para el share sheet. */
  text: string
  /** Meses con torneos ('YYYY-MM' asc), para el selector del estilo 'Mes'. */
  months?: string[]
}) {
  const [open, setOpen] = useState(false)
  const [style, setStyle] = useState<CalendarStyle>('a')
  const [busy, setBusy] = useState(false)
  const [hint, setHint] = useState<string | null>(null)

  // Opciones de mes: los meses con torneos, o el mes actual como fallback.
  const now = new Date()
  const currentMonth = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
  const monthOptions = months.length > 0 ? months : [currentMonth]
  const [month, setMonth] = useState(monthOptions[0])

  const styledUrl =
    style === 'd'
      ? `${storyUrl}?style=d&month=${month}`
      : `${storyUrl}?style=${style}`

  async function share() {
    if (busy) return
    setBusy(true)
    try {
      // Copiamos el link primero: al agregar el sticker de Enlace en Instagram,
      // ya queda en el portapapeles para pegar de una.
      let copied = false
      try {
        await navigator.clipboard?.writeText(url)
        copied = true
      } catch {
        // Sin permiso de clipboard: no es bloqueante.
      }

      const res = await fetch(styledUrl)
      const blob = await res.blob()
      const file = new File([blob], 'matchup-historia.png', {
        type: blob.type || 'image/png',
      })

      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text })
      } else {
        const href = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = href
        a.download = 'matchup-historia.png'
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(href)
        window.open('https://www.instagram.com/', '_blank', 'noopener')
      }

      setHint(
        copied
          ? 'Link copiado. En Instagram: subí la historia → sticker de Enlace → pegar.'
          : 'En Instagram: subí la historia → sticker de Enlace → pegá el link del calendario.'
      )
    } catch {
      window.open(styledUrl, '_blank', 'noopener')
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-[#E1306C]/40 bg-[#E1306C]/10 px-3.5 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-[#E1306C]/20"
      >
        <InstagramIcon className="h-4 w-4 text-[#E1306C]" />
        Compartir en historia
      </button>
    )
  }

  return (
    <div className="basis-full flex flex-col items-center gap-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Diseño de la historia
      </p>
      <div className="flex flex-wrap justify-center gap-1.5">
        {STYLES.map((s) => (
          <button
            key={s.value}
            type="button"
            onClick={() => setStyle(s.value)}
            aria-pressed={style === s.value}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
              style === s.value
                ? 'bg-volt text-volt-foreground'
                : 'border border-border text-muted-foreground hover:bg-accent hover:text-foreground'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>
      {style === 'd' && (
        <select
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          aria-label="Mes del calendario"
          className="rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-semibold text-foreground"
        >
          {monthOptions.map((m) => (
            <option key={m} value={m}>
              {monthLabelOf(m)}
            </option>
          ))}
        </select>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element -- preview de un PNG generado por API route; next/image es innecesario */}
      <img
        key={styledUrl}
        src={styledUrl}
        alt={`Vista previa de la historia (${
          STYLES.find((s) => s.value === style)?.label
        })`}
        className="h-52 w-auto rounded-xl border border-border"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          disabled={busy}
          className="rounded-lg border border-border px-3.5 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent disabled:opacity-60"
        >
          Cancelar
        </button>
        <button
          type="button"
          onClick={share}
          disabled={busy}
          className="inline-flex items-center gap-1.5 rounded-lg border border-[#E1306C]/40 bg-[#E1306C]/10 px-3.5 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-[#E1306C]/20 disabled:opacity-60"
        >
          <InstagramIcon className="h-4 w-4 text-[#E1306C]" />
          {busy ? 'Generando…' : 'Compartir esta historia'}
        </button>
      </div>
      {hint && (
        <p className="text-xs leading-relaxed text-muted-foreground">{hint}</p>
      )}
    </div>
  )
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  )
}
