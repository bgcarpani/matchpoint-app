'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { MatchFormat, MatchStatus, ScoringMode } from '@/lib/types/database'
import {
  suggestZoneCount,
  maxZoneCount,
  MATCH_FORMAT_LABELS,
  MATCH_FORMAT_HINTS,
  supportsWinnerVsLoser,
  type StandingRow,
} from '@/lib/domain/zone'
import type { RecordResultInput } from '@/lib/domain/match'
import { ZoneStandings } from '@/components/zones/zone-standings'
import { ZoneMatchCard } from '@/components/zones/zone-match-card'
import { type CourtOption } from '@/components/zones/match-court-select'
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
  setZonesFormat,
  generateNextRound,
  addManualMatch,
  removeManualMatch,
  type ActionResult,
} from '@/app/tournaments/[id]/zones/actions'

export type { CourtOption }

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
  const [selectedZone, setSelectedZone] = useState<'all' | string>('all')

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

  // El filtro puede quedar apuntando a una zona que ya no existe (tras regenerar).
  const activeZone = zones.some((z) => z.id === selectedZone)
    ? selectedZone
    : 'all'
  const visibleZones =
    activeZone === 'all' ? zones : zones.filter((z) => z.id === activeZone)

  // Formato global: el mismo para todas las zonas (lo representa la 1ª zona).
  const currentFormat = zones[0]?.matchFormat ?? 'round_robin'
  const allSupportWvl =
    hasZones && zones.every((z) => supportsWinnerVsLoser(z.pairs.length))

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

        {/* Formato global (igual para todas las zonas) */}
        {canManage && hasZones && (
          <div className="mt-5 border-t border-border pt-5">
            <label className="block max-w-sm">
              <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Formato de los partidos
              </span>
              <select
                value={currentFormat}
                disabled={pending}
                onChange={(e) => {
                  const next = e.target.value as MatchFormat
                  if (next !== currentFormat)
                    run(
                      () => setZonesFormat(tournamentId, next),
                      '¿Cambiar el formato? Se reemplazan los partidos de todas las zonas.'
                    )
                }}
                className="mt-1.5 w-full rounded-md border border-border bg-card px-2 py-1.5 text-sm text-foreground outline-none focus:border-volt/60 disabled:opacity-50"
              >
                <option value="round_robin">
                  {MATCH_FORMAT_LABELS.round_robin}
                </option>
                <option value="winner_vs_loser" disabled={!allSupportWvl}>
                  {MATCH_FORMAT_LABELS.winner_vs_loser}
                  {allSupportWvl ? '' : ' (todas las zonas con 4 parejas)'}
                </option>
                <option value="manual">{MATCH_FORMAT_LABELS.manual}</option>
              </select>
            </label>
            <p className="mt-1.5 text-xs text-muted-foreground">
              {MATCH_FORMAT_HINTS[currentFormat]}
            </p>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}
      </div>

      {/* Chips de navegación entre zonas (la pantalla puede ser larga) */}
      {hasZones && zones.length > 1 && (
        <div className="sticky top-0 z-10 -mx-1 flex flex-wrap gap-2 bg-background/80 px-1 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <ZoneChip
            label="Todas"
            active={activeZone === 'all'}
            onClick={() => setSelectedZone('all')}
          />
          {zones.map((z) => (
            <ZoneChip
              key={z.id}
              label={z.name}
              active={activeZone === z.id}
              onClick={() => setSelectedZone(z.id)}
            />
          ))}
        </div>
      )}

      {/* Zonas — parejas + posiciones (siempre visibles) */}
      {hasZones && (
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Zonas
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            {visibleZones.map((zone) => (
              <ZoneCard
                key={zone.id}
                zone={zone}
                allZones={zones}
                canManage={canManage}
                canRecordResults={canRecordResults}
                disabled={pending}
                onMovePair={(pairId, targetZoneId) =>
                  run(() => movePair(tournamentId, pairId, targetZoneId))
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
        </section>
      )}

      {/* Partidos — sección aparte, agrupada por zona */}
      {hasZones && (
        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Partidos
          </p>
          <div className="grid gap-4 lg:grid-cols-2">
            {visibleZones.map((zone) => (
              <ZoneMatchesCard
                key={zone.id}
                zone={zone}
                courts={courts}
                canManage={canManage}
                canRecordResults={canRecordResults}
                scoringMode={scoringMode}
                gamesPerSet={gamesPerSet}
                disabled={pending}
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
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function ZoneChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
        active
          ? 'bg-volt text-volt-foreground'
          : 'border border-border text-muted-foreground hover:bg-accent hover:text-foreground'
      }`}
    >
      {label}
    </button>
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
  canManage,
  canRecordResults,
  disabled,
  onMovePair,
  onFreeze,
  onFreezeManual,
  onReopen,
}: {
  zone: ZoneView
  allZones: ZoneView[]
  canManage: boolean
  canRecordResults: boolean
  disabled: boolean
  onMovePair: (pairId: string, targetZoneId: string) => void
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

  // winner_vs_loser: para poder cerrar posiciones hace falta la ronda 2 jugada.
  const round2 = zone.matches.filter((m) => m.round === 2)

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

/**
 * Tarjeta de la sección "Partidos" para una zona: formato (lectura), botón de
 * ronda 2 (winner_vs_loser), lista de partidos compactos y alta manual. Vive
 * separada de la tarjeta de zona (parejas + posiciones) para achicar el alto de
 * la pantalla; opera sobre el mismo `zone` y las mismas actions.
 */
function ZoneMatchesCard({
  zone,
  courts,
  canManage,
  canRecordResults,
  scoringMode,
  gamesPerSet,
  disabled,
  onGenerateNextRound,
  onAddMatch,
  onRemoveMatch,
  onAssignCourt,
  onRecordResult,
  onClearResult,
}: {
  zone: ZoneView
  courts: CourtOption[]
  canManage: boolean
  canRecordResults: boolean
  scoringMode: ScoringMode
  gamesPerSet: number
  disabled: boolean
  onGenerateNextRound: () => void
  onAddMatch: (team1PairId: string, team2PairId: string) => void
  onRemoveMatch: (matchId: string) => void
  onAssignCourt: (matchId: string, courtId: string | null) => void
  onRecordResult: (matchId: string, input: RecordResultInput) => void
  onClearResult: (matchId: string) => void
}) {
  const isWvl = zone.matchFormat === 'winner_vs_loser'
  const isManual = zone.matchFormat === 'manual'

  // winner_vs_loser: gating de la ronda 2.
  const round1 = zone.matches.filter((m) => m.round === 1)
  const round2 = zone.matches.filter((m) => m.round === 2)
  const round1Complete =
    round1.length === 2 && round1.every((m) => m.status === 'finished')
  const canGenerateRound2 =
    isWvl && canRecordResults && round1Complete && round2.length === 0

  return (
    <div className="rounded-2xl border border-border bg-card/40 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-lg text-foreground">{zone.name}</h3>
        <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
          {MATCH_FORMAT_LABELS[zone.matchFormat]}
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between gap-2">
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
              <ZoneMatchCard
                match={m}
                courts={courts}
                scoringMode={scoringMode}
                gamesPerSet={gamesPerSet}
                canRecordResults={canRecordResults}
                canManage={canManage}
                isManual={isManual}
                disabled={disabled}
                onAssignCourt={(courtId) => onAssignCourt(m.id, courtId)}
                onRecordResult={(input) => onRecordResult(m.id, input)}
                onClearResult={() => onClearResult(m.id)}
                onRemoveMatch={() => onRemoveMatch(m.id)}
              />
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
