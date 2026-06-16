'use client'

import { Fragment, useState } from 'react'
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
export function PublicBracketView({ rounds }: { rounds: PublicBracketRound[] }) {
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
                <div className="flex w-[230px] shrink-0 flex-col px-2">
                  <div className="mb-3 text-center text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                    {round.label}
                  </div>
                  <div className="flex flex-1 flex-col justify-around gap-3">
                    {round.matches.map((m) => (
                      <MatchCard key={m.id} match={m} />
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
                <ul className="mt-2 space-y-2">
                  {round.matches.map((m) => (
                    <li
                      key={m.id}
                      className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-sm"
                    >
                      <span className="min-w-0">
                        <TeamName
                          label={m.team1Label}
                          winner={m.winner === 'team1'}
                        />{' '}
                        <span className="text-muted-foreground">vs</span>{' '}
                        <TeamName
                          label={m.team2Label}
                          winner={m.winner === 'team2'}
                        />
                      </span>
                      <span className="flex items-center gap-2">
                        {m.score && (
                          <span className="rounded-md bg-card px-2 py-0.5 text-xs font-semibold text-foreground tnum ring-1 ring-border">
                            {m.score}
                          </span>
                        )}
                        {m.courtName && (
                          <span className="rounded-md bg-volt/10 px-2 py-0.5 text-xs font-medium text-volt ring-1 ring-volt/30">
                            {m.courtName}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

function MatchCard({ match: m }: { match: PublicBracketMatch }) {
  return (
    <div className="rounded-lg border border-border bg-secondary text-sm">
      <TeamRow label={m.team1Label} winner={m.winner === 'team1'} />
      <div className="border-t border-border" />
      <TeamRow label={m.team2Label} winner={m.winner === 'team2'} />
      {(m.score || m.courtName) && (
        <div className="flex flex-wrap items-center gap-1.5 border-t border-border px-2.5 py-1.5">
          {m.score && (
            <span className="rounded-md bg-card px-2 py-0.5 text-xs font-semibold text-foreground tnum ring-1 ring-border">
              {m.score}
            </span>
          )}
          {m.courtName && (
            <span className="rounded-md bg-volt/10 px-2 py-0.5 text-xs font-medium text-volt ring-1 ring-volt/30">
              {m.courtName}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function TeamRow({ label, winner }: { label: string | null; winner: boolean }) {
  if (!label)
    return (
      <div className="px-2.5 py-1.5 text-sm italic text-muted-foreground">
        A definir
      </div>
    )
  return (
    <div
      className={`flex items-center gap-2 px-2.5 py-1.5 ${
        winner ? 'font-semibold text-foreground' : 'text-foreground'
      }`}
    >
      {winner && <span className="text-volt">✓</span>}
      <span className="min-w-0 truncate">{label}</span>
    </div>
  )
}

function TeamName({
  label,
  winner,
}: {
  label: string | null
  winner: boolean
}) {
  if (!label)
    return <span className="italic text-muted-foreground">A definir</span>
  return (
    <span className={winner ? 'font-semibold text-foreground' : 'text-foreground'}>
      {label}
    </span>
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
