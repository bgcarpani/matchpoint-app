'use client'

import { useState } from 'react'
import type { PublicZoneView } from '@/lib/public/zones'
import { ZoneStandings } from '@/components/zones/zone-standings'

/**
 * Vista pública de zonas con filtro real por zona (client-side).
 * Reemplaza la navegación por anclas (#zone-id) que sólo desplazaba la página:
 * al elegir una zona, se muestra únicamente esa zona ("Todas" = todas).
 */
export function PublicZonesView({ zones }: { zones: PublicZoneView[] }) {
  const [selected, setSelected] = useState<string>('all')

  // El filtro puede quedar apuntando a una zona inexistente: caer a 'all'.
  const active = zones.some((z) => z.id === selected) ? selected : 'all'
  const visible = active === 'all' ? zones : zones.filter((z) => z.id === active)

  return (
    <>
      {zones.length > 1 && (
        <nav className="sticky top-0 z-10 mt-8 -mx-1 flex flex-wrap gap-2 bg-background/80 px-1 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <FilterChip
            label="Todas"
            active={active === 'all'}
            onClick={() => setSelected('all')}
          />
          {zones.map((zone) => (
            <FilterChip
              key={zone.id}
              label={zone.name}
              active={active === zone.id}
              onClick={() => setSelected(zone.id)}
            />
          ))}
        </nav>
      )}

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {visible.map((zone) => (
          <article
            key={zone.id}
            className="rounded-2xl border border-border bg-card/40 p-6"
          >
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="font-display text-xl text-foreground">
                {zone.name}
              </h2>
              <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground tnum">
                {zone.pairs.length} parejas
              </span>
            </div>

            <ul className="mt-4 space-y-1.5">
              {zone.pairs.map((p) => (
                <li
                  key={p.pairId}
                  className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm text-foreground"
                >
                  {p.label}
                </li>
              ))}
            </ul>

            {zone.standings.length > 0 && (
              <>
                <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  Posiciones
                </p>
                <ZoneStandings
                  rows={zone.standings}
                  frozen={zone.standingsFrozen}
                />
              </>
            )}

            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Partidos
            </p>
            <ul className="mt-2 space-y-2">
              {zone.matches.length === 0 && (
                <li className="text-sm text-muted-foreground">Sin partidos.</li>
              )}
              {zone.matches.map((m, i) => {
                const prev = zone.matches[i - 1]
                const showRoundHeader =
                  zone.matchFormat === 'winner_vs_loser' &&
                  (!prev || prev.round !== m.round)
                return (
                  <li
                    key={m.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-sm"
                  >
                    {showRoundHeader && (
                      <p className="w-full text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Ronda {m.round}
                      </p>
                    )}
                    <span className="text-foreground">
                      <span className={m.winner === 'team1' ? 'font-semibold' : ''}>
                        {m.team1Label}
                      </span>{' '}
                      <span className="text-muted-foreground">vs</span>{' '}
                      <span className={m.winner === 'team2' ? 'font-semibold' : ''}>
                        {m.team2Label}
                      </span>
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
                )
              })}
            </ul>
          </article>
        ))}
      </div>
    </>
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
