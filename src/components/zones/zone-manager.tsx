'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { CourtType } from '@/lib/types/database'
import { suggestZoneCount, maxZoneCount } from '@/lib/domain/zone'
import {
  generateZones,
  movePair,
  assignCourt,
  publishZones,
  type ActionResult,
} from '@/app/tournaments/[id]/zones/actions'

export interface ZonePairRow {
  pairId: string
  label: string
}

export interface ZoneMatchRow {
  id: string
  round: number
  courtId: string | null
  team1Label: string
  team2Label: string
}

export interface ZoneView {
  id: string
  name: string
  isPublished: boolean
  pairs: ZonePairRow[]
  matches: ZoneMatchRow[]
}

export interface CourtOption {
  id: string
  name: string
  type: CourtType
}

export function ZoneManager({
  tournamentId,
  zones,
  courts,
  acceptedCount,
  canManage,
  published,
}: {
  tournamentId: string
  zones: ZoneView[]
  courts: CourtOption[]
  acceptedCount: number
  canManage: boolean
  published: boolean
}) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function run(action: () => Promise<ActionResult>, confirmMsg?: string) {
    if (confirmMsg && !confirm(confirmMsg)) return
    setError(null)
    startTransition(async () => {
      const res = await action()
      if ('error' in res) {
        setError(res.error)
        return
      }
      router.refresh()
    })
  }

  const hasZones = zones.length > 0

  return (
    <div className="space-y-6">
      {/* Estado / acciones globales */}
      <div className="rounded-2xl border border-border bg-card/40 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {published
                ? 'Zonas publicadas'
                : hasZones
                  ? 'Zonas en borrador'
                  : 'Sin zonas'}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {published
                ? 'Las zonas son visibles públicamente. Sólo podés cambiar la cancha de cada partido.'
                : `${acceptedCount} ${acceptedCount === 1 ? 'pareja aceptada' : 'parejas aceptadas'} para repartir.`}
            </p>
          </div>

          {canManage && hasZones && (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                run(
                  () => publishZones(tournamentId),
                  '¿Publicar las zonas? Una vez publicadas no se pueden regenerar ni reasignar parejas.'
                )
              }
              className="rounded-lg bg-volt px-4 py-2 text-sm font-semibold text-volt-foreground transition hover:brightness-105 disabled:opacity-50"
            >
              Publicar zonas
            </button>
          )}
        </div>

        {canManage && (
          <GenerateForm
            disabled={pending}
            acceptedCount={acceptedCount}
            hasZones={hasZones}
            onGenerate={(n) =>
              run(
                () => generateZones(tournamentId, n),
                hasZones
                  ? '¿Regenerar las zonas? Se reemplazan las actuales y sus partidos.'
                  : undefined
              )
            }
          />
        )}

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      </div>

      {/* Zonas */}
      {hasZones && (
        <div className="grid gap-4 lg:grid-cols-2">
          {zones.map((zone) => (
            <ZoneCard
              key={zone.id}
              zone={zone}
              allZones={zones}
              courts={courts}
              canManage={canManage}
              disabled={pending}
              onMovePair={(pairId, targetZoneId) =>
                run(() => movePair(tournamentId, pairId, targetZoneId))
              }
              onAssignCourt={(matchId, courtId) =>
                run(() => assignCourt(tournamentId, matchId, courtId))
              }
            />
          ))}
        </div>
      )}
    </div>
  )
}

function GenerateForm({
  acceptedCount,
  hasZones,
  disabled,
  onGenerate,
}: {
  acceptedCount: number
  hasZones: boolean
  disabled: boolean
  onGenerate: (numZones: number) => void
}) {
  const [count, setCount] = useState(() => String(suggestZoneCount(acceptedCount)))
  const max = maxZoneCount(acceptedCount)
  const tooFew = acceptedCount < 2

  return (
    <div className="mt-5 border-t border-border pt-5">
      {tooFew ? (
        <p className="text-sm text-muted-foreground">
          Necesitás al menos 2 parejas aceptadas para generar zonas.
        </p>
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Cantidad de zonas
            </span>
            <input
              type="number"
              min={1}
              max={max}
              value={count}
              disabled={disabled}
              onChange={(e) => setCount(e.target.value)}
              className="mt-2 w-28 rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground tnum outline-none focus:border-volt/60 disabled:opacity-50"
            />
          </label>
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              const n = Number(count)
              if (Number.isInteger(n) && n >= 1 && n <= max) onGenerate(n)
            }}
            className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-accent disabled:opacity-50"
          >
            {hasZones ? 'Regenerar' : 'Generar zonas'}
          </button>
          <span className="text-xs text-muted-foreground">
            Máximo {max} {max === 1 ? 'zona' : 'zonas'}.
          </span>
        </div>
      )}
    </div>
  )
}

function ZoneCard({
  zone,
  allZones,
  courts,
  canManage,
  disabled,
  onMovePair,
  onAssignCourt,
}: {
  zone: ZoneView
  allZones: ZoneView[]
  courts: CourtOption[]
  canManage: boolean
  disabled: boolean
  onMovePair: (pairId: string, targetZoneId: string) => void
  onAssignCourt: (matchId: string, courtId: string | null) => void
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/40 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-lg text-foreground">{zone.name}</h3>
        <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground tnum">
          {zone.pairs.length} parejas
        </span>
      </div>

      {/* Parejas */}
      <ul className="mt-4 space-y-2">
        {zone.pairs.map((p) => (
          <li
            key={p.pairId}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-secondary px-3 py-2"
          >
            <span className="text-sm text-foreground">{p.label}</span>
            {canManage && allZones.length > 1 && (
              <select
                value={zone.id}
                disabled={disabled}
                onChange={(e) => {
                  if (e.target.value !== zone.id)
                    onMovePair(p.pairId, e.target.value)
                }}
                className="rounded-md border border-border bg-card px-2 py-1 text-xs text-muted-foreground outline-none focus:border-volt/60 disabled:opacity-50"
                aria-label="Mover pareja a otra zona"
              >
                {allZones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name}
                  </option>
                ))}
              </select>
            )}
          </li>
        ))}
      </ul>

      {/* Partidos */}
      <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Partidos
      </p>
      <ul className="mt-2 space-y-2">
        {zone.matches.length === 0 && (
          <li className="text-sm text-muted-foreground">
            Sin partidos generados.
          </li>
        )}
        {zone.matches.map((m) => (
          <li
            key={m.id}
            className="rounded-lg border border-border bg-secondary px-3 py-2"
          >
            <div className="flex items-center justify-between gap-2 text-sm text-foreground">
              <span>
                {m.team1Label} <span className="text-muted-foreground">vs</span>{' '}
                {m.team2Label}
              </span>
            </div>
            <div className="mt-2">
              <select
                value={m.courtId ?? ''}
                disabled={disabled}
                onChange={(e) =>
                  onAssignCourt(m.id, e.target.value === '' ? null : e.target.value)
                }
                className="w-full rounded-md border border-border bg-card px-2 py-1.5 text-xs text-foreground outline-none focus:border-volt/60 disabled:opacity-50"
                aria-label="Asignar cancha al partido"
              >
                <option value="">Sin cancha asignada</option>
                {courts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.type === 'indoor' ? 'Techada' : 'Aire libre'})
                  </option>
                ))}
              </select>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
