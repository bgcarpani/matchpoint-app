'use client'

import { useState } from 'react'
import { formatDateTime } from '@/lib/format'
import { ShareButtons } from '@/components/share/share-buttons'

/**
 * Panel "Link de inscripción" del detalle del torneo: muestra la URL pública
 * (`/t/<id>`) lista para copiar y abrir. La URL absoluta la arma el server
 * (desde los headers de la request) y se recibe ya resuelta, para que funcione
 * igual en local y en producción sin hardcodear el dominio ni depender de
 * `window` en el cliente.
 */
export function ShareRegistrationLink({
  url,
  tournamentName,
  categoryGender,
  registrationOpen,
  registrationOpensAt,
}: {
  url: string
  tournamentName: string
  /** "6ta Masculino" / "Suma 14 Mixto": categoría + género destacados. */
  categoryGender: string
  registrationOpen: boolean
  /** Horario de apertura automática, o null si la apertura es manual. */
  registrationOpensAt: string | null
}) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard?.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card/40 p-6 sm:p-8">
      <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        Link de inscripción
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        Compartí este enlace para que las parejas se inscriban desde la página
        pública del torneo.
      </p>

      <div className="mt-5 flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2.5">
        <code className="flex-1 truncate text-xs text-foreground">{url}</code>
        <button
          type="button"
          onClick={copy}
          className="shrink-0 rounded-md bg-secondary px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-foreground transition-colors hover:bg-accent"
        >
          {copied ? 'Copiado' : 'Copiar'}
        </button>
      </div>

      {/* Fila de acciones: abrir + compartir. */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-sm font-semibold text-foreground transition-colors hover:bg-accent"
        >
          Abrir página pública ↗
        </a>
        <ShareButtons
          url={url}
          text={`🎾 Torneo ${categoryGender} — ${tournamentName}. ¡Inscribite en Matchpoint!`}
          storyUrl={`${url}/og/story`}
        />
      </div>

      {registrationOpen ? (
        <p className="mt-4 rounded-md border border-volt/30 bg-volt/10 px-3 py-2 text-xs text-foreground">
          La inscripción está abierta: las parejas ya pueden enviar solicitudes
          desde este link.
        </p>
      ) : (
        <p className="mt-4 rounded-md border border-border bg-secondary/60 px-3 py-2 text-xs text-muted-foreground">
          Podés compartir el link desde ya.{' '}
          {registrationOpensAt
            ? `La inscripción abre automáticamente el ${formatDateTime(
                registrationOpensAt
              )}; recién ahí las parejas verán el formulario habilitado.`
            : 'La inscripción todavía no está abierta: la abrís manualmente desde el ciclo de vida y ahí se habilita el formulario.'}
        </p>
      )}
    </div>
  )
}
