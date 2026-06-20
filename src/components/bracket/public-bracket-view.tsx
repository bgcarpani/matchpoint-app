'use client'

import { Fragment, useState } from 'react'
import type { ScoringMode } from '@/lib/types/database'
import type { PublicBracketRound, PublicBracketMatch } from '@/lib/public/bracket'
import {
  BracketViewToggle,
  type BracketViewMode,
} from '@/components/bracket/bracket-view-toggle'

/**
 * Vista pública del cuadro de llaves, con dos formatos a elección:
 * - "Cuadro": árbol; cada ronda es una columna y cada cruce se centra entre sus
 *   dos alimentadores (gracias a `justify-around` + columnas de igual alto), con
 *   conectores `]`. Scroll horizontal en pantallas chicas.
 * - "Lista": rondas apiladas con filtro por ronda (el formato previo).
 */
export function PublicBracketView({
  rounds,
  scoringMode,
}: {
  rounds: PublicBracketRound[]
  scoringMode: ScoringMode
}) {
  const [view, setView] = useState<BracketViewMode>('cuadro')
  const [selected, setSelected] = useState<'all' | number>('all')

  const active = rounds.some((r) => r.round === selected) ? selected : 'all'
  const visible =
    active === 'all' ? rounds : rounds.filter((r) => r.round === active)

  return (
    <div className="mt-8">
      <div className="flex justify-end">
        <BracketViewToggle view={view} onChange={setView} />
      </div>

      {view === 'cuadro' ? (
        <div className="mt-4 overflow-x-auto pb-4">
          <div className="flex min-w-max items-stretch">
            {rounds.map((round, ri) => (
              <Fragment key={round.round}>
                <div className="flex w-[288px] shrink-0 flex-col px-2">
                  <div className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {round.label}
                  </div>
                  <div className="flex flex-1 flex-col justify-around gap-3">
                    {round.matches.map((m) => (
                      <MatchCard key={m.id} match={m} scoringMode={scoringMode} />
                    ))}
                  </div>
                </div>

                {ri < rounds.length - 1 && (
                  <Connectors count={rounds[ri + 1].matches.length} />
                )}
              </Fragment>
            ))}
          </div>
        </div>
      ) : (
        <>
          {rounds.length > 1 && (
            <nav className="sticky top-0 z-10 mt-4 -mx-1 flex flex-wrap gap-2 bg-background/80 px-1 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <FilterChip
                label="Todas"
                active={active === 'all'}
                onClick={() => setSelected('all')}
              />
              {rounds.map((round) => (
                <FilterChip
                  key={round.round}
                  label={round.label}
                  active={active === round.round}
                  onClick={() => setSelected(round.round)}
                />
              ))}
            </nav>
          )}

          <div className="mt-6 space-y-8">
            {visible.map((round) => (
              <section key={round.round}>
                <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {round.label}
                </h2>
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  {round.matches.map((m) => (
                    <MatchCard key={m.id} match={m} scoringMode={scoringMode} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/**
 * Tarjeta de cruce (lado público), espejo de lectura del `BracketMatchCard` del
 * organizer: las dos parejas apiladas con su casillero de resultado a la derecha,
 * ganador resaltado, cruces sin definir con placeholder, y la cancha en el pie.
 */
function MatchCard({
  match: m,
  scoringMode,
}: {
  match: PublicBracketMatch
  scoringMode: ScoringMode
}) {
  const pending = !m.team1Label || !m.team2Label
  const showScores = m.played && !pending

  // Puntajes por equipo (en orden de set; en games es un único valor).
  const teamScores = (team: 0 | 1): (number | null)[] =>
    scoringMode === 'games'
      ? [team === 0 ? m.team1Score : m.team2Score]
      : (m.scoreDetail ?? []).map((s) => s?.[team] ?? null)

  return (
    <div className="rounded-lg border border-border bg-card">
      {/* Grid de 2 columnas: nombre (envuelve) + casilleros, alineados por fila.
          El nombre completo entra aunque ocupe dos líneas. */}
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5 px-3 py-2">
        <PairName label={m.team1Label} highlight={m.winner === 'team1'} />
        {showScores ? (
          <ScoreRow values={teamScores(0)} winner={m.winner === 'team1'} />
        ) : (
          <span />
        )}
        <PairName label={m.team2Label} highlight={m.winner === 'team2'} />
        {showScores ? (
          <ScoreRow values={teamScores(1)} winner={m.winner === 'team2'} />
        ) : (
          <span />
        )}
      </div>

      {m.courtName && (
        <div className="flex items-center gap-1.5 border-t border-border px-3 py-1.5 text-xs text-muted-foreground">
          <PinIcon className="h-3.5 w-3.5" />
          {m.courtName}
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
  if (!label)
    return (
      <span className="py-1 text-sm italic leading-snug text-muted-foreground">
        A definir
      </span>
    )
  return (
    <span
      className={`py-1 text-sm leading-snug ${
        highlight ? 'font-semibold text-foreground' : 'text-foreground'
      }`}
    >
      {label}
    </span>
  )
}

function ScoreRow({
  values,
  winner,
}: {
  values: (number | null)[]
  winner: boolean
}) {
  return (
    <div className="flex shrink-0 gap-1">
      {values.map((v, i) => (
        <ScoreCell key={i} value={v} winner={winner} />
      ))}
    </div>
  )
}

function ScoreCell({
  value,
  winner,
}: {
  value: number | null
  winner: boolean
}) {
  return (
    <span
      className={`inline-flex h-[30px] w-[38px] items-center justify-center rounded-md text-sm font-mono tnum ring-1 ${
        winner
          ? 'bg-[color:var(--volt-surface)] font-bold text-volt ring-volt/30'
          : 'bg-secondary text-muted-foreground ring-border'
      }`}
    >
      {value ?? '–'}
    </span>
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

function Connectors({ count }: { count: number }) {
  return (
    <div className="flex w-5 shrink-0 flex-col">
      <div aria-hidden className="mb-3 text-xs">
        &nbsp;
      </div>
      <div className="flex flex-1 flex-col">
        {Array.from({ length: count }).map((_, j) => (
          <div key={j} className="flex flex-1 items-center">
            <div className="h-1/2 w-full rounded-r-md border-y border-r border-border" />
          </div>
        ))}
      </div>
    </div>
  )
}

function FilterChip({
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
