'use client'

import Link from 'next/link'
import {
  formatShiftWhen,
  slotsLabel,
  whatsappLink,
  instagramLink,
  type PublicShift,
} from '@/lib/domain/shift'
import { useShiftToken } from '@/lib/shifts/hooks'

/**
 * Tarjeta de turno del tablero público. Los `full` van opacados; si el turno fue
 * creado en este dispositivo (token en localStorage) muestra el atajo "Editar".
 */
export function ShiftCard({ shift }: { shift: PublicShift }) {
  const isFull = shift.status === 'full'
  const manageToken = useShiftToken(shift.id)

  return (
    <li
      className={`elevate rounded-2xl border bg-card p-5 transition-opacity ${
        isFull ? 'border-border opacity-60' : 'border-border'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="font-display truncate text-lg text-foreground">
            {shift.court_name}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {slotsLabel(shift.slots_needed)}
            {shift.category && (
              <>
                {' · '}
                <span className="text-foreground">{shift.category}</span>
              </>
            )}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span className="rounded-md bg-secondary px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-secondary-foreground tnum">
            {formatShiftWhen(shift.start_time)}
          </span>
          {isFull && (
            <span className="rounded-md bg-muted px-2 py-0.5 text-[0.7rem] font-semibold uppercase tracking-wide text-muted-foreground">
              Completo
            </span>
          )}
        </div>
      </div>

      {shift.notes && (
        <p className="mt-3 text-sm italic text-muted-foreground">
          “{shift.notes}”
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <a
          href={whatsappLink(shift)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-volt px-3.5 py-2 text-sm font-semibold text-volt-foreground transition-transform active:scale-[0.98] hover:brightness-105"
        >
          WhatsApp
        </a>
        {shift.instagram && (
          <a
            href={instagramLink(shift.instagram)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3.5 py-2 text-sm font-medium text-foreground transition-colors hover:border-volt/50"
          >
            Instagram
          </a>
        )}
        <span className="ml-auto text-xs text-muted-foreground">
          {shift.creator_name}
        </span>
        {manageToken && (
          <Link
            href={`/turnos/${shift.id}/editar?token=${manageToken}`}
            className="inline-flex items-center gap-1 rounded-lg border border-volt/40 bg-volt/10 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-volt transition-colors hover:bg-volt/15"
          >
            Tuyo · Editar
          </Link>
        )}
      </div>
    </li>
  )
}
