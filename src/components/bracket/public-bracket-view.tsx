'use client'

import { useState } from 'react'
import type { PublicBracketRound } from '@/lib/public/bracket'

/**
 * Vista pública del cuadro de llaves con filtro real por ronda (client-side),
 * espejo de `PublicZonesView`: chips "Todas / Octavos / …", una ronda a la vez,
 * y tarjetas de cruce compactas. Reduce el alto de la pantalla en cuadros largos.
 */
export function PublicBracketView({ rounds }: { rounds: PublicBracketRound[] }) {
  const [selected, setSelected] = useState<'all' | number>('all')

  // El filtro puede quedar apuntando a una ronda inexistente: caer a 'all'.
  const active = rounds.some((r) => r.round === selected) ? selected : 'all'
  const visible =
    active === 'all' ? rounds : rounds.filter((r) => r.round === active)

  return (
    <>
      {rounds.length > 1 && (
        <nav className="sticky top-0 z-10 mt-8 -mx-1 flex flex-wrap gap-2 bg-background/80 px-1 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/60">
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
                    <TeamName label={m.team1Label} winner={m.winner === 'team1'} />{' '}
                    <span className="text-muted-foreground">vs</span>{' '}
                    <TeamName label={m.team2Label} winner={m.winner === 'team2'} />
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
  )
}

function TeamName({
  label,
  winner,
}: {
  label: string | null
  winner: boolean
}) {
  if (!label) return <span className="italic text-muted-foreground">A definir</span>
  return (
    <span className={winner ? 'font-semibold text-foreground' : 'text-foreground'}>
      {label}
    </span>
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
