'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type {
  CourtType,
  MatchFormat,
  MatchStatus,
  ScoringMode,
} from '@/lib/types/database'
import {
  suggestZoneCount,
  maxZoneCount,
  MATCH_FORMAT_LABELS,
  MATCH_FORMAT_HINTS,
  supportsWinnerVsLoser,
  type StandingRow,
} from '@/lib/domain/zone'
import type { RecordResultInput } from '@/lib/domain/match'
import { MatchResultForm } from '@/components/zones/match-result-form'
import { ZoneStandings } from '@/components/zones/zone-standings'
import {
  generateZones,
  movePair,
  assignCourt,
  publishZones,
  recordMatchResult,
  clearMatchResult,
  freezeZoneStandings,
  freezeManualStandings,
  reopenZoneStandings,
  regenerateZoneMatches,
  generateNextRound,
  addManualMatch,
  removeManualMatch,
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
  status: MatchStatus
  team1Score: number | null
  team2Score: number | null
  scoreDetail: number[][] | null
  /** lado ganador, derivado en el server */
  winner: 'team1' | 'team2' | null
}

export interface ZoneView {
  id: string
  name: string
  isPublished: boolean
  matchFormat: MatchFormat
  standingsFrozen: boolean
  standings: StandingRow[]
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
  canRecordResults,
  scoringMode,
  gamesPerSet,
}: {
  tournamentId: string
  zones: ZoneView[]
  courts: CourtOption[]
  acceptedCount: number
  canManage: boolean
  published: boolean
  /** torneo en curso → habilita cargar/corregir resultados */
  canRecordResults: boolean
  scoringMode: ScoringMode
  gamesPerSet: number
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
              canRecordResults={canRecordResults}
              scoringMode={scoringMode}
              gamesPerSet={gamesPerSet}
              disabled={pending}
              onMovePair={(pairId, targetZoneId) =>
                run(() => movePair(tournamentId, pairId, targetZoneId))
              }
              onChangeFormat={(format) =>
                run(
                  () => regenerateZoneMatches(tournamentId, zone.id, format),
                  '¿Cambiar el formato? Se reemplazan los partidos de esta zona.'
                )
              }
              onGenerateNextRound={() =>
                run(() => generateNextRound(tournamentId, zone.id))
              }
              onAddMatch={(t1, t2) =>
                run(() => addManualMatch(tournamentId, zone.id, t1, t2))
              }
              onRemoveMatch={(matchId) =>
                run(
                  () => removeManualMatch(tournamentId, matchId),
                  '¿Borrar este partido?'
                )
              }
              onAssignCourt={(matchId, courtId) =>
                run(() => assignCourt(tournamentId, matchId, courtId))
              }
              onRecordResult={(matchId, input) =>
                run(() => recordMatchResult(tournamentId, matchId, input))
              }
              onClearResult={(matchId) =>
                run(
                  () => clearMatchResult(tournamentId, matchId),
                  '¿Borrar el resultado de este partido?'
                )
              }
              onFreeze={() =>
                run(
                  () => freezeZoneStandings(tournamentId, zone.id),
                  '¿Cerrar las posiciones de esta zona? Vas a poder reabrirlas para corregir resultados.'
                )
              }
              onFreezeManual={(pairIds) =>
                run(
                  () => freezeManualStandings(tournamentId, zone.id, pairIds),
                  '¿Cerrar las posiciones con este orden?'
                )
              }
              onReopen={() =>
                run(() => reopenZoneStandings(tournamentId, zone.id))
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
  canRecordResults,
  scoringMode,
  gamesPerSet,
  disabled,
  onMovePair,
  onChangeFormat,
  onGenerateNextRound,
  onAddMatch,
  onRemoveMatch,
  onAssignCourt,
  onRecordResult,
  onClearResult,
  onFreeze,
  onFreezeManual,
  onReopen,
}: {
  zone: ZoneView
  allZones: ZoneView[]
  courts: CourtOption[]
  canManage: boolean
  canRecordResults: boolean
  scoringMode: ScoringMode
  gamesPerSet: number
  disabled: boolean
  onMovePair: (pairId: string, targetZoneId: string) => void
  onChangeFormat: (format: MatchFormat) => void
  onGenerateNextRound: () => void
  onAddMatch: (team1PairId: string, team2PairId: string) => void
  onRemoveMatch: (matchId: string) => void
  onAssignCourt: (matchId: string, courtId: string | null) => void
  onRecordResult: (matchId: string, input: RecordResultInput) => void
  onClearResult: (matchId: string) => void
  onFreeze: () => void
  onFreezeManual: (pairIds: string[]) => void
  onReopen: () => void
}) {
  const isWvl = zone.matchFormat === 'winner_vs_loser'
  const isManual = zone.matchFormat === 'manual'

  const allFinished =
    zone.matches.length > 0 &&
    zone.matches.every((m) => m.status === 'finished')
  const showStandings = canRecordResults || zone.standingsFrozen

  // winner_vs_loser: gating de la ronda 2.
  const round1 = zone.matches.filter((m) => m.round === 1)
  const round2 = zone.matches.filter((m) => m.round === 2)
  const round1Complete =
    round1.length === 2 && round1.every((m) => m.status === 'finished')
  const canGenerateRound2 =
    isWvl && canRecordResults && round1Complete && round2.length === 0

  // ¿Se pueden cerrar las posiciones (formatos no-manual)?
  const canFreeze =
    canRecordResults &&
    !zone.standingsFrozen &&
    !isManual &&
    allFinished &&
    (!isWvl || round2.length === 2)

  return (
    <div className="rounded-2xl border border-border bg-card/40 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-lg text-foreground">{zone.name}</h3>
        <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground tnum">
          {zone.pairs.length} parejas
        </span>
      </div>

      {/* Formato */}
      {canManage ? (
        <div className="mt-3">
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Formato
            </span>
            <select
              value={zone.matchFormat}
              disabled={disabled}
              onChange={(e) => {
                const next = e.target.value as MatchFormat
                if (next !== zone.matchFormat) onChangeFormat(next)
              }}
              className="mt-1.5 w-full rounded-md border border-border bg-card px-2 py-1.5 text-sm text-foreground outline-none focus:border-volt/60 disabled:opacity-50"
            >
              <option value="round_robin">
                {MATCH_FORMAT_LABELS.round_robin}
              </option>
              <option
                value="winner_vs_loser"
                disabled={!supportsWinnerVsLoser(zone.pairs.length)}
              >
                {MATCH_FORMAT_LABELS.winner_vs_loser}
                {supportsWinnerVsLoser(zone.pairs.length) ? '' : ' (4 parejas)'}
              </option>
              <option value="manual">{MATCH_FORMAT_LABELS.manual}</option>
            </select>
          </label>
          <p className="mt-1.5 text-xs text-muted-foreground">
            {MATCH_FORMAT_HINTS[zone.matchFormat]}
          </p>
        </div>
      ) : (
        <p className="mt-2 text-xs text-muted-foreground">
          Formato: {MATCH_FORMAT_LABELS[zone.matchFormat]}
        </p>
      )}

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
      <div className="mt-5 flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Partidos
        </p>
        {canGenerateRound2 && (
          <button
            type="button"
            disabled={disabled}
            onClick={onGenerateNextRound}
            className="rounded-md bg-volt px-2.5 py-1 text-xs font-semibold text-volt-foreground transition hover:brightness-105 disabled:opacity-50"
          >
            Generar ronda 2
          </button>
        )}
      </div>
      <ul className="mt-2 space-y-2">
        {zone.matches.length === 0 && (
          <li className="text-sm text-muted-foreground">
            {isManual
              ? 'Agregá los partidos de la zona.'
              : 'Sin partidos generados.'}
          </li>
        )}
        {zone.matches.map((m, i) => {
          // En winner_vs_loser mostramos un encabezado por ronda.
          const prev = zone.matches[i - 1]
          const showRoundHeader = isWvl && (!prev || prev.round !== m.round)
          return (
            <li key={m.id}>
              {showRoundHeader && (
                <p className="mb-1 mt-2 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Ronda {m.round}
                </p>
              )}
              <div className="rounded-lg border border-border bg-secondary px-3 py-2">
                <div className="flex items-center justify-between gap-2 text-sm text-foreground">
                  <span>
                    {m.team1Label}{' '}
                    <span className="text-muted-foreground">vs</span>{' '}
                    {m.team2Label}
                  </span>
                  {canManage && isManual && (
                    <button
                      type="button"
                      disabled={disabled}
                      onClick={() => onRemoveMatch(m.id)}
                      className="shrink-0 rounded-md border border-border px-2 py-0.5 text-xs text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-50"
                      aria-label="Borrar partido"
                    >
                      Borrar
                    </button>
                  )}
                </div>
                <div className="mt-2">
                  <select
                    value={m.courtId ?? ''}
                    disabled={disabled}
                    onChange={(e) =>
                      onAssignCourt(
                        m.id,
                        e.target.value === '' ? null : e.target.value
                      )
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

                {canRecordResults && (
                  <MatchResultForm
                    mode={scoringMode}
                    gamesPerSet={gamesPerSet}
                    team1Label={m.team1Label}
                    team2Label={m.team2Label}
                    result={{
                      status: m.status,
                      team1Score: m.team1Score,
                      team2Score: m.team2Score,
                      scoreDetail: m.scoreDetail,
                      winner: m.winner,
                    }}
                    disabled={disabled}
                    onSubmit={(input) => onRecordResult(m.id, input)}
                    onClear={() => onClearResult(m.id)}
                  />
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {/* Alta manual de partidos */}
      {canManage && isManual && zone.pairs.length >= 2 && (
        <AddManualMatchForm
          pairs={zone.pairs}
          disabled={disabled}
          onAdd={onAddMatch}
        />
      )}

      {/* Posiciones */}
      {showStandings && (
        <div className="mt-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Posiciones
            </p>
            {canRecordResults &&
              (zone.standingsFrozen ? (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={onReopen}
                  className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-foreground transition hover:bg-accent disabled:opacity-50"
                >
                  Reabrir posiciones
                </button>
              ) : (
                canFreeze && (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={onFreeze}
                    className="rounded-md bg-volt px-2.5 py-1 text-xs font-semibold text-volt-foreground transition hover:brightness-105 disabled:opacity-50"
                  >
                    Cerrar posiciones
                  </button>
                )
              ))}
          </div>

          {/* Editor manual de posiciones (formato manual, sin congelar) */}
          {canRecordResults && isManual && !zone.standingsFrozen ? (
            <ManualStandingsEditor
              pairs={zone.pairs}
              allFinished={allFinished || zone.matches.length === 0}
              disabled={disabled}
              onFreeze={onFreezeManual}
            />
          ) : (
            <ZoneStandings rows={zone.standings} frozen={zone.standingsFrozen} />
          )}

          {/* Hints contextuales */}
          {canRecordResults && !zone.standingsFrozen && !isManual && (
            <FreezeHint
              isWvl={isWvl}
              allFinished={allFinished}
              round2Generated={round2.length === 2}
            />
          )}
        </div>
      )}
    </div>
  )
}

/** Mensaje contextual de qué falta para poder cerrar posiciones (no-manual). */
function FreezeHint({
  isWvl,
  allFinished,
  round2Generated,
}: {
  isWvl: boolean
  allFinished: boolean
  round2Generated: boolean
}) {
  if (isWvl && !round2Generated) {
    return (
      <p className="mt-2 text-xs text-muted-foreground">
        Cargá la ronda 1 y generá la ronda 2 para definir las posiciones.
      </p>
    )
  }
  if (!allFinished) {
    return (
      <p className="mt-2 text-xs text-muted-foreground">
        Cargá todos los resultados para poder cerrar las posiciones.
      </p>
    )
  }
  return null
}

/** Form de alta de un partido manual (dos selects de parejas de la zona). */
function AddManualMatchForm({
  pairs,
  disabled,
  onAdd,
}: {
  pairs: ZonePairRow[]
  disabled: boolean
  onAdd: (team1PairId: string, team2PairId: string) => void
}) {
  const [t1, setT1] = useState('')
  const [t2, setT2] = useState('')
  const valid = t1 !== '' && t2 !== '' && t1 !== t2

  return (
    <div className="mt-3 rounded-lg border border-dashed border-border p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Agregar partido
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <select
          value={t1}
          disabled={disabled}
          onChange={(e) => setT1(e.target.value)}
          className="min-w-0 flex-1 rounded-md border border-border bg-card px-2 py-1.5 text-xs text-foreground outline-none focus:border-volt/60 disabled:opacity-50"
          aria-label="Pareja 1"
        >
          <option value="">Pareja 1…</option>
          {pairs.map((p) => (
            <option key={p.pairId} value={p.pairId}>
              {p.label}
            </option>
          ))}
        </select>
        <span className="text-xs text-muted-foreground">vs</span>
        <select
          value={t2}
          disabled={disabled}
          onChange={(e) => setT2(e.target.value)}
          className="min-w-0 flex-1 rounded-md border border-border bg-card px-2 py-1.5 text-xs text-foreground outline-none focus:border-volt/60 disabled:opacity-50"
          aria-label="Pareja 2"
        >
          <option value="">Pareja 2…</option>
          {pairs.map((p) => (
            <option key={p.pairId} value={p.pairId}>
              {p.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={disabled || !valid}
          onClick={() => {
            if (valid) {
              onAdd(t1, t2)
              setT1('')
              setT2('')
            }
          }}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-accent disabled:opacity-50"
        >
          Agregar
        </button>
      </div>
    </div>
  )
}

/**
 * Editor de posiciones manuales: ordena las parejas con flechas y cierra con el
 * orden elegido (1º arriba). Estado local (useState), sin RHF.
 */
function ManualStandingsEditor({
  pairs,
  allFinished,
  disabled,
  onFreeze,
}: {
  pairs: ZonePairRow[]
  allFinished: boolean
  disabled: boolean
  onFreeze: (pairIds: string[]) => void
}) {
  const [order, setOrder] = useState<ZonePairRow[]>(pairs)

  // Si cambia el set de parejas (alta/baja de partidos no afecta, pero sí mover
  // parejas), resincronizamos preservando el orden actual cuando es posible.
  const sameSet =
    order.length === pairs.length &&
    order.every((o) => pairs.some((p) => p.pairId === o.pairId))
  const rows = sameSet ? order : pairs

  function move(index: number, dir: -1 | 1) {
    const next = [...rows]
    const target = index + dir
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    setOrder(next)
  }

  return (
    <div className="mt-2 overflow-hidden rounded-lg border border-border">
      <ul>
        {rows.map((row, i) => (
          <li
            key={row.pairId}
            className="flex items-center justify-between gap-2 border-t border-border px-3 py-2 first:border-t-0"
          >
            <span className="flex items-center gap-2 text-sm text-foreground">
              <span className="tnum w-5 text-muted-foreground">{i + 1}</span>
              {row.label}
            </span>
            <span className="flex gap-1">
              <button
                type="button"
                disabled={disabled || i === 0}
                onClick={() => move(i, -1)}
                className="rounded border border-border px-1.5 py-0.5 text-xs text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-30"
                aria-label="Subir"
              >
                ↑
              </button>
              <button
                type="button"
                disabled={disabled || i === rows.length - 1}
                onClick={() => move(i, 1)}
                className="rounded border border-border px-1.5 py-0.5 text-xs text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-30"
                aria-label="Bajar"
              >
                ↓
              </button>
            </span>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between gap-2 bg-secondary/60 px-3 py-2">
        <span className="text-xs text-muted-foreground">
          {allFinished
            ? 'Ordená y cerrá las posiciones.'
            : 'Cargá todos los resultados para cerrar.'}
        </span>
        <button
          type="button"
          disabled={disabled || !allFinished}
          onClick={() => onFreeze(rows.map((r) => r.pairId))}
          className="rounded-md bg-volt px-2.5 py-1 text-xs font-semibold text-volt-foreground transition hover:brightness-105 disabled:opacity-50"
        >
          Cerrar posiciones
        </button>
      </div>
    </div>
  )
}
