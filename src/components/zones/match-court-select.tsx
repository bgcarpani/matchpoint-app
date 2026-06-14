'use client'

import { useState } from 'react'
import type { CourtType } from '@/lib/types/database'

export interface CourtOption {
  id: string
  name: string
  type: CourtType
}

const courtTypeLabel = (type: CourtType) =>
  type === 'indoor' ? 'Techada' : 'Aire libre'

/**
 * Selector de cancha de un partido, reutilizado en zonas y llaves.
 *
 * Cuando el partido tiene resultado cargado (`finished`), la cancha queda
 * bloqueada para evitar cambios accidentales: muestra la cancha asignada y un
 * botón "Editar" que la re-habilita (estado local). Sin resultado, el select
 * está siempre disponible.
 */
export function MatchCourtSelect({
  courtId,
  courts,
  finished,
  disabled,
  onAssign,
}: {
  courtId: string | null
  courts: CourtOption[]
  finished: boolean
  disabled: boolean
  onAssign: (courtId: string | null) => void
}) {
  const [editing, setEditing] = useState(false)
  const locked = finished && !editing

  if (locked) {
    const court = courts.find((c) => c.id === courtId)
    return (
      <div className="mt-2 flex items-center justify-between gap-2 rounded-md border border-border bg-card px-2 py-1.5">
        <span className="truncate text-xs text-muted-foreground">
          {court
            ? `${court.name} (${courtTypeLabel(court.type)})`
            : 'Sin cancha asignada'}
        </span>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setEditing(true)}
          className="shrink-0 rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-50"
        >
          Editar cancha
        </button>
      </div>
    )
  }

  return (
    <div className="mt-2">
      <select
        value={courtId ?? ''}
        disabled={disabled}
        onChange={(e) =>
          onAssign(e.target.value === '' ? null : e.target.value)
        }
        className="w-full rounded-md border border-border bg-card px-2 py-1.5 text-xs text-foreground outline-none focus:border-volt/60 disabled:opacity-50"
        aria-label="Asignar cancha al partido"
      >
        <option value="">Sin cancha asignada</option>
        {courts.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} ({courtTypeLabel(c.type)})
          </option>
        ))}
      </select>
    </div>
  )
}
