'use client'

import { useState } from 'react'
import type { ScoringMode } from '@/lib/types/database'
import { computeResult, type RecordResultInput } from '@/lib/domain/match'
import type { CourtOption } from '@/components/zones/match-court-select'
import type { BracketMatchView } from '@/components/bracket/bracket-board'

const courtTypeLabel = (type: CourtOption['type']) =>
  type === 'indoor' ? 'Techada' : 'Aire libre'

/**
 * Tarjeta compacta de un partido de llaves (mismo estilo marcador que
 * `ZoneMatchCard`): las dos parejas apiladas con su casillero de resultado a la
 * derecha y un pie discreto con la cancha + botón Guardar. Adaptada al bracket:
 * los cruces sin definir (falta una pareja) muestran un placeholder, y la cancha
 * sólo se asigna con el torneo en curso (`canRecordResults`).
 */
export function BracketMatchCard({
  match,
  courts,
  scoringMode,
  gamesPerSet,
  canRecordResults,
  disabled,
  onAssignCourt,
  onRecordResult,
  onClearResult,
}: {
  match: BracketMatchView
  courts: CourtOption[]
  scoringMode: ScoringMode
  gamesPerSet: number
  canRecordResults: boolean
  disabled: boolean
  onAssignCourt: (courtId: string | null) => void
  onRecordResult: (input: RecordResultInput) => void
  onClearResult: () => void
}) {
  const finished = match.status === 'finished'
  const [editing, setEditing] = useState(false)

  // Cruce sin definir: todavía no se sabe alguna de las parejas.
  const pending = !match.team1 || !match.team2

  const showInputs = canRecordResults && !pending && (!finished || editing)

  // Estado de edición (string para los inputs; sin RHF por el React Compiler).
  const [g1, setG1] = useState(
    scoringMode === 'games' && match.team1Score != null
      ? String(match.team1Score)
      : ''
  )
  const [g2, setG2] = useState(
    scoringMode === 'games' && match.team2Score != null
      ? String(match.team2Score)
      : ''
  )
  const [sets, setSets] = useState<string[][]>(() => {
    const seeded =
      scoringMode === 'best_of_3_sets' && match.scoreDetail?.length
        ? match.scoreDetail.map(([a, b]) => [String(a), String(b)])
        : [['', '']]
    const padded = [...seeded]
    while (padded.length < 3) padded.push(['', ''])
    return padded.slice(0, 3)
  })
  const [error, setError] = useState<string | null>(null)

  function buildInput(): RecordResultInput {
    if (scoringMode === 'games') {
      return { games1: Number(g1), games2: Number(g2) }
    }
    const parsed: [number, number][] = []
    for (const [a, b] of sets) {
      if (a.trim() === '' && b.trim() === '') continue
      parsed.push([Number(a), Number(b)])
    }
    return { sets: parsed }
  }

  function submit() {
    const input = buildInput()
    const check = computeResult(scoringMode, gamesPerSet, input)
    if ('error' in check) {
      setError(check.error)
      return
    }
    setError(null)
    onRecordResult(input)
    setEditing(false)
  }

  function setSetValue(row: number, col: 0 | 1, value: string) {
    setSets((prev) => {
      const next = prev.map((r) => [...r])
      next[row][col] = value
      return next
    })
  }

  // Columnas del marcador: 1 en games, hasta 3 (sets) en best_of_3.
  const cols =
    scoringMode === 'games'
      ? [0]
      : showInputs
        ? [0, 1, 2]
        : (match.scoreDetail ?? []).map((_, i) => i)

  const showScoreboard =
    !pending && (canRecordResults || (finished && match.scoreDetail))

  return (
    <div className="rounded-lg border border-border bg-secondary">
      {/* Marcador: parejas apiladas + casilleros a la derecha */}
      <div className="flex items-stretch gap-3 px-3 py-2">
        <div className="min-w-0 flex-1 space-y-1">
          <PairName label={match.team1?.label ?? null} highlight={match.winner === 'team1'} />
          <PairName label={match.team2?.label ?? null} highlight={match.winner === 'team2'} />
        </div>

        {showScoreboard && (
          <div className="flex shrink-0 gap-1">
            {cols.map((col) => (
              <div key={col} className="flex flex-col gap-1">
                <ScoreCell
                  team="team1"
                  col={col}
                  scoringMode={scoringMode}
                  editing={showInputs}
                  disabled={disabled}
                  match={match}
                  g={g1}
                  setG={setG1}
                  sets={sets}
                  setSetValue={setSetValue}
                />
                <ScoreCell
                  team="team2"
                  col={col}
                  scoringMode={scoringMode}
                  editing={showInputs}
                  disabled={disabled}
                  match={match}
                  g={g2}
                  setG={setG2}
                  sets={sets}
                  setSetValue={setSetValue}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <p className="px-3 pb-1 text-xs text-destructive">{error}</p>}

      {/* Pie: cancha (izq) + acción (der) — sólo con partido definido. */}
      {!pending && (canRecordResults || match.courtId) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border px-2.5 py-1.5">
          {canRecordResults ? (
            <div className="no-print">
              <CourtControl
                courtId={match.courtId}
                courts={courts}
                disabled={disabled}
                onAssign={onAssignCourt}
              />
            </div>
          ) : (
            <span className="px-1 text-xs text-muted-foreground">
              {courts.find((c) => c.id === match.courtId)?.name ?? ''}
            </span>
          )}
          {canRecordResults && match.courtId && (
            <span className="hidden px-1 text-xs text-muted-foreground print:inline">
              {courts.find((c) => c.id === match.courtId)?.name ?? ''}
            </span>
          )}

          {canRecordResults && (
            <div className="no-print flex items-center gap-1.5">
              {showInputs ? (
                <>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={submit}
                    className="rounded-md bg-volt px-2.5 py-1 text-xs font-semibold text-volt-foreground transition hover:brightness-105 disabled:opacity-50"
                  >
                    Guardar
                  </button>
                  {finished && (
                    <>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          setEditing(false)
                          setError(null)
                        }}
                        className="rounded-md border border-border px-2 py-1 text-xs font-semibold text-muted-foreground transition hover:bg-accent disabled:opacity-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        disabled={disabled}
                        onClick={() => {
                          onClearResult()
                          setEditing(false)
                          setError(null)
                        }}
                        className="rounded-md border border-border px-2 py-1 text-xs font-semibold text-muted-foreground transition hover:bg-accent disabled:opacity-50"
                      >
                        Borrar resultado
                      </button>
                    </>
                  )}
                </>
              ) : (
                <>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400">
                    <CheckIcon className="h-3.5 w-3.5" /> Jugado
                  </span>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => setEditing(true)}
                    className="rounded-md border border-border px-2 py-0.5 text-xs font-semibold text-muted-foreground transition hover:bg-accent hover:text-foreground disabled:opacity-50"
                  >
                    Editar
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function PairName({
  label,
  highlight,
}: {
  label: string | null
  highlight: boolean
}) {
  return (
    <div className="flex h-[30px] items-center">
      {label ? (
        <span
          className={`truncate text-sm ${
            highlight ? 'font-semibold text-foreground' : 'text-foreground'
          }`}
        >
          {label}
        </span>
      ) : (
        // En blanco al imprimir (llaves vacías) para poder escribir encima.
        <span className="truncate text-sm italic text-muted-foreground print:hidden">
          A definir
        </span>
      )}
    </div>
  )
}

/** Casillero de resultado de un equipo en una columna (set o games). */
function ScoreCell({
  team,
  col,
  scoringMode,
  editing,
  disabled,
  match,
  g,
  setG,
  sets,
  setSetValue,
}: {
  team: 'team1' | 'team2'
  col: number
  scoringMode: ScoringMode
  editing: boolean
  disabled: boolean
  match: BracketMatchView
  g: string
  setG: (v: string) => void
  sets: string[][]
  setSetValue: (row: number, col: 0 | 1, value: string) => void
}) {
  const idx = team === 'team1' ? 0 : 1
  const winner = match.winner === team

  if (editing) {
    const value = scoringMode === 'games' ? g : (sets[col]?.[idx] ?? '')
    return (
      <input
        type="number"
        min={0}
        max={99}
        inputMode="numeric"
        value={value}
        disabled={disabled}
        aria-label={
          scoringMode === 'games'
            ? `Games ${team === 'team1' ? 'pareja 1' : 'pareja 2'}`
            : `Set ${col + 1} ${team === 'team1' ? 'pareja 1' : 'pareja 2'}`
        }
        onChange={(e) =>
          scoringMode === 'games'
            ? setG(e.target.value)
            : setSetValue(col, idx as 0 | 1, e.target.value)
        }
        className="h-[30px] w-[38px] rounded-md border border-border bg-background text-center text-sm text-foreground tnum outline-none focus:border-volt/60 disabled:opacity-50"
      />
    )
  }

  // Lectura (jugado): número fijo, marcador deportivo.
  const fixed =
    scoringMode === 'games'
      ? team === 'team1'
        ? match.team1Score
        : match.team2Score
      : match.scoreDetail?.[col]?.[idx]
  return (
    <span
      className={`inline-flex h-[30px] w-[38px] items-center justify-center rounded-md bg-card text-sm tnum ring-1 ring-border ${
        winner ? 'font-semibold text-foreground' : 'text-muted-foreground'
      }`}
    >
      {fixed ?? '–'}
    </span>
  )
}

/** Selector de cancha discreto: ícono de ubicación + select + chevron. */
function CourtControl({
  courtId,
  courts,
  disabled,
  onAssign,
}: {
  courtId: string | null
  courts: CourtOption[]
  disabled: boolean
  onAssign: (courtId: string | null) => void
}) {
  return (
    <div className="relative flex items-center text-muted-foreground">
      <PinIcon className="pointer-events-none absolute left-2 h-3.5 w-3.5" />
      <select
        value={courtId ?? ''}
        disabled={disabled}
        onChange={(e) => onAssign(e.target.value === '' ? null : e.target.value)}
        aria-label="Asignar cancha al partido"
        className="max-w-[170px] cursor-pointer appearance-none truncate rounded-md bg-transparent py-1 pl-7 pr-6 text-xs text-muted-foreground outline-none transition hover:text-foreground focus:text-foreground disabled:opacity-50"
      >
        <option value="">Asignar cancha</option>
        {courts.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name} ({courtTypeLabel(c.type)})
          </option>
        ))}
      </select>
      <ChevronIcon className="pointer-events-none absolute right-1.5 h-3.5 w-3.5" />
    </div>
  )
}

function PinIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  )
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  )
}
