'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  advanceTournamentStatus,
  deleteTournament,
} from '@/app/tournaments/actions'
import {
  nextStatus,
  STATUS_LABELS,
  ADVANCE_ACTION_LABELS,
} from '@/lib/domain/tournament'
import { Button } from '@/components/ui/button'
import type { TournamentStatus } from '@/lib/types/database'

export function LifecycleControls({
  tournamentId,
  status,
}: {
  tournamentId: string
  status: TournamentStatus
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const next = nextStatus(status)

  function onAdvance() {
    if (!next) return
    if (
      !confirm(
        `¿Avanzar a "${STATUS_LABELS[next]}"? Las transiciones no se pueden revertir.`
      )
    )
      return
    setError(null)
    startTransition(async () => {
      const res = await advanceTournamentStatus(tournamentId)
      if ('error' in res) {
        setError(res.error)
        return
      }
      router.refresh()
    })
  }

  function onDelete() {
    if (!confirm('¿Eliminar este torneo? Esta acción no se puede deshacer.'))
      return
    setError(null)
    startTransition(async () => {
      const res = await deleteTournament(tournamentId)
      // En éxito redirige; sólo llega acá si hubo error.
      if (res && 'error' in res) setError(res.error)
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {next && (
        <Button
          size="lg"
          className="font-display h-11"
          disabled={pending}
          onClick={onAdvance}
        >
          {pending ? 'Procesando…' : ADVANCE_ACTION_LABELS[status]}
        </Button>
      )}
      {status === 'draft' && (
        <Button
          variant="destructive"
          size="lg"
          className="h-11"
          disabled={pending}
          onClick={onDelete}
        >
          Eliminar
        </Button>
      )}
      {error && (
        <p className="w-full text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}
