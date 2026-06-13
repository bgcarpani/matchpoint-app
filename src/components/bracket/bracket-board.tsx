'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import type { MatchStatus, ScoringMode } from '@/lib/types/database'
import type { RecordResultInput } from '@/lib/domain/match'
import { bracketRoundLabel } from '@/lib/domain/bracket'
import { MatchResultForm } from '@/components/zones/match-result-form'
import {
  generateBracket,
  recordBracketResult,
  clearBracketResult,
  publishBracket,
  swapBracketParticipants,
  type ActionResult,
} from '@/app/tournaments/[id]/bracket/actions'

export interface BracketMatchView {
  id: string
  round: number
  slot: number
  team1: { pairId: string; label: string } | null
  team2: { pairId: string; label: string } | null
  status: MatchStatus
  team1Score: number | null
  team2Score: number | null
  scoreDetail: number[][] | null
  winner: 'team1' | 'team2' | null
}

export function BracketBoard({
  tournamentId,
  matches,
  participants,
  published,
  canGenerate,
  generateHint,
  canRecordResults,
  canEditSeeds,
  scoringMode,
  gamesPerSet,
}: {
  tournamentId: string
  matches: BracketMatchView[]
  participants: { pairId: string; label: string }[]
  published: boolean
  canGenerate: boolean
  generateHint: string | null
  canRecordResults: boolean
  canEditSeeds: boolean
  scoringMode: ScoringMode
  gamesPerSet: number
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [swapA, setSwapA] = useState('')
  const [swapB, setSwapB] = useState('')

  const hasBracket = matches.length > 0
  const totalRounds = useMemo(
    () => matches.reduce((m, x) => Math.max(m, x.round), 0),
    [matches]
  )

  const rounds = useMemo(() => {
    const byRound = new Map<number, BracketMatchView[]>()
    for (const m of matches) {
      const arr = byRound.get(m.round) ?? []
      arr.push(m)
      byRound.set(m.round, arr)
    }
    return [...byRound.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([round, ms]) => ({
        round,
        matches: ms.sort((a, b) => a.slot - b.slot),
      }))
  }, [matches])

  // Campeón: ganador de la final (último round, 1 partido) si terminó.
  const champion = useMemo(() => {
    const final = matches.find((m) => m.round === totalRounds)
    if (!final || final.status !== 'finished' || !final.winner) return null
    return final.winner === 'team1' ? final.team1?.label : final.team2?.label
  }, [matches, totalRounds])

  function run(action: () => Promise<ActionResult>) {
    setError(null)
    startTransition(async () => {
      const res = await action()
      if (res && 'error' in res) setError(res.error)
      else router.refresh()
    })
  }

  return (
    <div>
      {/* Controles */}
      <div className="flex flex-wrap items-center gap-2.5">
        {!hasBracket ? (
          <>
            <button
              type="button"
              disabled={pending || !canGenerate}
              onClick={() => run(() => generateBracket(tournamentId))}
              className="rounded-lg bg-volt px-4 py-2 text-sm font-semibold text-volt-foreground transition hover:brightness-105 disabled:opacity-50"
            >
              {pending ? 'Generando…' : 'Generar llaves'}
            </button>
            {!canGenerate && generateHint && (
              <span className="text-xs text-muted-foreground">{generateHint}</span>
            )}
          </>
        ) : published ? (
          <span className="rounded-md bg-volt/10 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-volt ring-1 ring-volt/30">
            Llaves publicadas
          </span>
        ) : (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => publishBracket(tournamentId))}
              className="rounded-lg bg-volt px-4 py-2 text-sm font-semibold text-volt-foreground transition hover:brightness-105 disabled:opacity-50"
            >
              Publicar llaves
            </button>
            <button
              type="button"
              disabled={pending || !canGenerate}
              onClick={() => {
                if (
                  confirm(
                    'Regenerar reemplaza las llaves actuales y borra los resultados cargados. ¿Continuar?'
                  )
                )
                  run(() => generateBracket(tournamentId))
              }}
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-accent disabled:opacity-50"
            >
              Regenerar
            </button>
          </>
        )}
      </div>

      {error && (
        <p className="mt-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      {champion && (
        <div className="mt-5 rounded-2xl border border-volt/40 bg-volt/5 p-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Campeón
          </p>
          <p className="font-display mt-1 text-2xl text-foreground">{champion}</p>
        </div>
      )}

      {/* Override manual de cruces (antes de publicar y sin resultados) */}
      {canEditSeeds && participants.length >= 2 && (
        <div className="mt-5 rounded-xl border border-border bg-card/40 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Reacomodar cruces
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Intercambiá la posición de dos parejas en el cuadro.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <SwapSelect value={swapA} onChange={setSwapA} options={participants} />
            <span className="text-muted-foreground">↔</span>
            <SwapSelect value={swapB} onChange={setSwapB} options={participants} />
            <button
              type="button"
              disabled={pending || !swapA || !swapB || swapA === swapB}
              onClick={() => {
                run(() => swapBracketParticipants(tournamentId, swapA, swapB))
                setSwapA('')
                setSwapB('')
              }}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-accent disabled:opacity-50"
            >
              Intercambiar
            </button>
          </div>
        </div>
      )}

      {/* Cuadro */}
      {hasBracket && (
        <div className="mt-6 space-y-6">
          {rounds.map(({ round, matches: ms }) => (
            <section key={round}>
              <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {bracketRoundLabel(round, totalRounds)}
              </h2>
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                {ms.map((m) => (
                  <article
                    key={m.id}
                    className="rounded-xl border border-border bg-card/40 p-4"
                  >
                    <div className="text-sm">
                      <TeamLine
                        label={m.team1?.label ?? null}
                        isWinner={m.winner === 'team1'}
                      />
                      <p className="my-0.5 text-center text-[0.7rem] uppercase tracking-[0.14em] text-muted-foreground">
                        vs
                      </p>
                      <TeamLine
                        label={m.team2?.label ?? null}
                        isWinner={m.winner === 'team2'}
                      />
                    </div>

                    {m.team1 && m.team2 ? (
                      canRecordResults ? (
                        <MatchResultForm
                          mode={scoringMode}
                          gamesPerSet={gamesPerSet}
                          team1Label={m.team1.label}
                          team2Label={m.team2.label}
                          result={{
                            status: m.status,
                            team1Score: m.team1Score,
                            team2Score: m.team2Score,
                            scoreDetail: m.scoreDetail,
                            winner: m.winner,
                          }}
                          disabled={pending}
                          onSubmit={(input: RecordResultInput) =>
                            run(() =>
                              recordBracketResult(tournamentId, m.id, input)
                            )
                          }
                          onClear={() =>
                            run(() => clearBracketResult(tournamentId, m.id))
                          }
                        />
                      ) : (
                        m.status === 'finished' && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Resultado cargado.
                          </p>
                        )
                      )
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">
                        A definir.
                      </p>
                    )}
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}

function TeamLine({
  label,
  isWinner,
}: {
  label: string | null
  isWinner: boolean
}) {
  return (
    <p
      className={
        label
          ? isWinner
            ? 'font-semibold text-foreground'
            : 'text-foreground'
          : 'text-muted-foreground italic'
      }
    >
      {label ?? 'A definir'}
    </p>
  )
}

function SwapSelect({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: { pairId: string; label: string }[]
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-volt/60"
    >
      <option value="">Elegí una pareja…</option>
      {options.map((o) => (
        <option key={o.pairId} value={o.pairId}>
          {o.label}
        </option>
      ))}
    </select>
  )
}
