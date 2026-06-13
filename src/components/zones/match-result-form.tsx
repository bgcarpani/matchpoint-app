'use client'

import { useState } from 'react'
import type { MatchStatus, ScoringMode } from '@/lib/types/database'
import {
  computeResult,
  formatResult,
  type RecordResultInput,
} from '@/lib/domain/match'

interface MatchResult {
  status: MatchStatus
  team1Score: number | null
  team2Score: number | null
  scoreDetail: number[][] | null
  /** lado ganador, derivado en el server (para resaltar) */
  winner: 'team1' | 'team2' | null
}

/**
 * Carga/corrección del resultado de un partido, según el modo de scoring del
 * torneo. Estado local (sin RHF, por el React Compiler). En `finished` muestra
 * el marcador con acciones Editar/Borrar; al editar abre los inputs.
 */
export function MatchResultForm({
  mode,
  gamesPerSet,
  team1Label,
  team2Label,
  result,
  disabled,
  onSubmit,
  onClear,
}: {
  mode: ScoringMode
  gamesPerSet: number
  team1Label: string
  team2Label: string
  result: MatchResult
  disabled: boolean
  onSubmit: (input: RecordResultInput) => void
  onClear: () => void
}) {
  const finished = result.status === 'finished'
  const [editing, setEditing] = useState(false)

  if (finished && !editing) {
    const score = formatResult(
      mode,
      result.team1Score,
      result.team2Score,
      result.scoreDetail
    )
    return (
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-md border border-volt/30 bg-volt/5 px-3 py-2">
        <span className="text-sm text-foreground tnum">
          <Winner side="team1" winner={result.winner}>
            {team1Label}
          </Winner>
          <span className="mx-2 font-semibold text-volt">{score}</span>
          <Winner side="team2" winner={result.winner}>
            {team2Label}
          </Winner>
        </span>
        <span className="flex gap-1.5">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setEditing(true)}
            className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-foreground transition hover:bg-accent disabled:opacity-50"
          >
            Editar
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={onClear}
            className="rounded-md border border-border px-2.5 py-1 text-xs font-semibold text-muted-foreground transition hover:bg-accent disabled:opacity-50"
          >
            Borrar
          </button>
        </span>
      </div>
    )
  }

  return (
    <Editor
      mode={mode}
      gamesPerSet={gamesPerSet}
      result={result}
      disabled={disabled}
      showCancel={finished}
      onCancel={() => setEditing(false)}
      onSubmit={(input) => {
        onSubmit(input)
        setEditing(false)
      }}
    />
  )
}

function Winner({
  side,
  winner,
  children,
}: {
  side: 'team1' | 'team2'
  winner: 'team1' | 'team2' | null
  children: React.ReactNode
}) {
  return (
    <span className={winner === side ? 'font-semibold text-foreground' : ''}>
      {children}
    </span>
  )
}

function Editor({
  mode,
  gamesPerSet,
  result,
  disabled,
  showCancel,
  onCancel,
  onSubmit,
}: {
  mode: ScoringMode
  gamesPerSet: number
  result: MatchResult
  disabled: boolean
  showCancel: boolean
  onCancel: () => void
  onSubmit: (input: RecordResultInput) => void
}) {
  // Modo games: dos números. Modo sets: hasta 3 filas [a,b].
  const [g1, setG1] = useState(
    mode === 'games' && result.team1Score != null ? String(result.team1Score) : ''
  )
  const [g2, setG2] = useState(
    mode === 'games' && result.team2Score != null ? String(result.team2Score) : ''
  )
  const seededSets: string[][] =
    mode === 'best_of_3_sets' && result.scoreDetail?.length
      ? result.scoreDetail.map(([a, b]) => [String(a), String(b)])
      : [['', '']]
  // Siempre dejamos una fila vacía extra para sumar sets (hasta 3).
  const [sets, setSets] = useState<string[][]>(() => {
    const padded = [...seededSets]
    while (padded.length < 3) padded.push(['', ''])
    return padded.slice(0, 3)
  })
  const [error, setError] = useState<string | null>(null)

  function buildInput(): RecordResultInput | null {
    if (mode === 'games') {
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
    if (!input) return
    // Pre-valida en cliente para feedback inmediato (el server revalida igual).
    const check = computeResult(mode, gamesPerSet, input)
    if ('error' in check) {
      setError(check.error)
      return
    }
    setError(null)
    onSubmit(input)
  }

  return (
    <div className="mt-2 rounded-md border border-border bg-card/60 px-3 py-2.5">
      {mode === 'games' ? (
        <div className="flex items-center gap-2">
          <ScoreInput value={g1} onChange={setG1} disabled={disabled} label="Games equipo 1" />
          <span className="text-muted-foreground">–</span>
          <ScoreInput value={g2} onChange={setG2} disabled={disabled} label="Games equipo 2" />
        </div>
      ) : (
        <div className="space-y-1.5">
          {sets.map((s, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-10 text-xs text-muted-foreground">Set {i + 1}</span>
              <ScoreInput
                value={s[0]}
                onChange={(v) => updateSet(setSets, i, 0, v)}
                disabled={disabled}
                label={`Set ${i + 1} equipo 1`}
              />
              <span className="text-muted-foreground">–</span>
              <ScoreInput
                value={s[1]}
                onChange={(v) => updateSet(setSets, i, 1, v)}
                disabled={disabled}
                label={`Set ${i + 1} equipo 2`}
              />
            </div>
          ))}
        </div>
      )}

      {error && <p className="mt-2 text-xs text-destructive">{error}</p>}

      <div className="mt-2.5 flex gap-1.5">
        <button
          type="button"
          disabled={disabled}
          onClick={submit}
          className="rounded-md bg-volt px-3 py-1 text-xs font-semibold text-volt-foreground transition hover:brightness-105 disabled:opacity-50"
        >
          Guardar
        </button>
        {showCancel && (
          <button
            type="button"
            disabled={disabled}
            onClick={onCancel}
            className="rounded-md border border-border px-3 py-1 text-xs font-semibold text-muted-foreground transition hover:bg-accent disabled:opacity-50"
          >
            Cancelar
          </button>
        )}
      </div>
    </div>
  )
}

function updateSet(
  setSets: React.Dispatch<React.SetStateAction<string[][]>>,
  row: number,
  col: 0 | 1,
  value: string
) {
  setSets((prev) => {
    const next = prev.map((r) => [...r])
    next[row][col] = value
    return next
  })
}

function ScoreInput({
  value,
  onChange,
  disabled,
  label,
}: {
  value: string
  onChange: (v: string) => void
  disabled: boolean
  label: string
}) {
  return (
    <input
      type="number"
      min={0}
      max={99}
      inputMode="numeric"
      value={value}
      disabled={disabled}
      aria-label={label}
      onChange={(e) => onChange(e.target.value)}
      className="w-14 rounded-md border border-border bg-background px-2 py-1 text-center text-sm text-foreground tnum outline-none focus:border-volt/60 disabled:opacity-50"
    />
  )
}
