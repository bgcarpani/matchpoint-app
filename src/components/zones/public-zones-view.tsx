'use client'

import { useState } from 'react'
import type { ScoringMode } from '@/lib/types/database'
import type { PublicZoneMatch, PublicZoneView } from '@/lib/public/zones'
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
            {zone.matches.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">Sin partidos.</p>
            ) : (
              <div className="mt-2 space-y-2">
                {zone.matches.map((m, i) => {
                  const prev = zone.matches[i - 1]
                  const showRoundHeader =
                    zone.matchFormat === 'winner_vs_loser' &&
                    (!prev || prev.round !== m.round)
                  return (
                    <div key={m.id}>
                      {showRoundHeader && (
                        <p className="mb-1.5 mt-1 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          Ronda {m.round}
                        </p>
                      )}
                      <PublicMatchCard match={m} scoringMode={zone.scoringMode} />
                    </div>
                  )
                })}
              </div>
            )}
          </article>
        ))}
      </div>
    </>
  )
}

/**
 * Tarjeta de partido (lado público), espejo de lectura del `ZoneMatchCard` del
 * organizer: las dos parejas apiladas con su casillero de resultado a la derecha
 * (marcador deportivo), ganador resaltado, y un pie con la cancha si la hay.
 */
function PublicMatchCard({
  match,
  scoringMode,
}: {
  match: PublicZoneMatch
  scoringMode: ScoringMode
}) {
  // Columnas del marcador: 1 en games, una por set en best_of_3.
  const cols =
    scoringMode === 'games' ? [0] : (match.scoreDetail ?? []).map((_, i) => i)

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-stretch gap-3 px-3 py-2">
        <div className="min-w-0 flex-1 space-y-1">
          <PublicPairName label={match.team1Label} highlight={match.winner === 'team1'} />
          <PublicPairName label={match.team2Label} highlight={match.winner === 'team2'} />
        </div>

        {match.played && (
          <div className="flex shrink-0 gap-1">
            {cols.map((col) => (
              <div key={col} className="flex flex-col gap-1">
                <PublicScoreCell
                  value={
                    scoringMode === 'games'
                      ? match.team1Score
                      : (match.scoreDetail?.[col]?.[0] ?? null)
                  }
                  winner={match.winner === 'team1'}
                />
                <PublicScoreCell
                  value={
                    scoringMode === 'games'
                      ? match.team2Score
                      : (match.scoreDetail?.[col]?.[1] ?? null)
                  }
                  winner={match.winner === 'team2'}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {match.courtName && (
        <div className="flex items-center gap-1.5 border-t border-border px-3 py-1.5 text-xs text-muted-foreground">
          <PinIcon className="h-3.5 w-3.5" />
          {match.courtName}
        </div>
      )}
    </div>
  )
}

function PublicPairName({ label, highlight }: { label: string; highlight: boolean }) {
  return (
    <div className="flex h-[30px] items-center">
      <span
        className={`truncate text-sm ${
          highlight ? 'font-semibold text-foreground' : 'text-foreground'
        }`}
      >
        {label}
      </span>
    </div>
  )
}

function PublicScoreCell({
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
