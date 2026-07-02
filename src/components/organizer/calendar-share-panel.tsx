'use client'

import { useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { ShareButtons } from '@/components/share/share-buttons'
import { CalendarStoryShare } from '@/components/share/calendar-story-share'

/**
 * Panel "Calendario público" del dashboard: muestra la URL estática del
 * establecimiento (`/o/<slug>`) lista para copiar y abrir, y un QR descargable
 * (SVG) pensado para imprimir y pegar en la pared. La URL absoluta la arma el
 * server desde los headers de la request, así funciona igual en local y prod
 * sin depender de `window`.
 *
 * El QR se descarga serializando el <svg> embebido a un Blob image/svg+xml —
 * sin canvas ni dependencias extra; el SVG escala sin pérdida al imprimir.
 */
export function CalendarSharePanel({
  url,
  establishmentName,
  months,
}: {
  url: string
  establishmentName?: string
  /** Meses con torneos ('YYYY-MM' asc) para el afiche mensual ('Mes'). */
  months?: string[]
}) {
  const [copied, setCopied] = useState(false)
  const qrRef = useRef<HTMLDivElement>(null)

  function copy() {
    navigator.clipboard?.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  function downloadQr() {
    const svg = qrRef.current?.querySelector('svg')
    if (!svg) return
    const source = new XMLSerializer().serializeToString(svg)
    const blob = new Blob(['<?xml version="1.0" encoding="UTF-8"?>\n', source], {
      type: 'image/svg+xml',
    })
    const href = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = href
    a.download = `calendario-${establishmentName ? slugify(establishmentName) : 'matchup'}.svg`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(href)
  }

  return (
    <div className="elevate rounded-2xl border border-border bg-card p-6 sm:p-8">
      <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        Calendario de torneos
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Un link fijo que siempre muestra tus torneos vigentes. Compartilo o
        imprimí el QR y pegalo en el club: el contenido se actualiza solo.
      </p>

      <div className="mt-5 grid gap-6 sm:grid-cols-[1fr_auto]">
        <div className="min-w-0">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5">
            <code className="min-w-0 flex-1 truncate text-xs text-foreground">
              {url}
            </code>
            <button
              type="button"
              onClick={copy}
              className="shrink-0 rounded-md bg-secondary px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-foreground transition-colors hover:bg-accent"
            >
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
            >
              Abrir calendario ↗
            </a>
            <button
              type="button"
              onClick={downloadQr}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
            >
              Descargar QR ↓
            </button>
            <ShareButtons
              url={url}
              text={
                establishmentName
                  ? `Mirá los torneos de ${establishmentName} en MatchUp:`
                  : 'Mirá los torneos en MatchUp:'
              }
            />
            <CalendarStoryShare
              storyUrl={`${url}/og/story`}
              url={url}
              months={months}
              text={
                establishmentName
                  ? `Mirá los torneos de ${establishmentName} en MatchUp:`
                  : 'Mirá los torneos en MatchUp:'
              }
            />
          </div>
        </div>

        {/* QR — fondo blanco para que escanee bien impreso */}
        <div className="flex flex-col items-center gap-2 justify-self-start sm:justify-self-end">
          <div ref={qrRef} className="rounded-xl bg-white p-3">
            <QRCodeSVG value={url} size={132} level="M" marginSize={0} />
          </div>
          <span className="text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">
            Escaneá para ver
          </span>
        </div>
      </div>
    </div>
  )
}

function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize('NFD')
      // quita marcas diacríticas combinantes (U+0300–U+036F)
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'matchup'
  )
}
