import { ZoneStandings } from '@/components/zones/zone-standings'
import type { ZoneView } from '@/components/zones/zone-manager'
import type { CourtOption } from '@/components/zones/match-court-select'

/**
 * Hoja de impresión de zonas (sólo visible al imprimir: `hidden print:block`).
 * A diferencia de la pantalla —que separa "Zonas" (parejas/posiciones) de
 * "Partidos"— acá cada zona es un bloque autocontenido (parejas + posiciones +
 * partidos) que entra, en lo posible, en UNA página: `break-after-page` entre
 * zonas y `break-inside-avoid` para no cortar una zona a la mitad. Los partidos
 * sin resultado muestran un casillero en blanco para escribir a mano.
 */
export function ZonesPrintSheet({
  zones,
  courts,
}: {
  zones: ZoneView[]
  courts: CourtOption[]
}) {
  const courtName = (id: string | null) =>
    id ? (courts.find((c) => c.id === id)?.name ?? '') : ''

  return (
    <div className="hidden print:block">
      {zones.map((zone, i) => {
        const showStandings =
          zone.standingsFrozen || zone.standings.some((s) => s.played > 0)
        const isWvl = zone.matchFormat === 'winner_vs_loser'
        return (
          <section
            key={zone.id}
            className={`break-inside-avoid ${i > 0 ? 'break-before-page' : ''}`}
          >
            <div className="mb-3 flex items-baseline justify-between gap-3">
              <h2 className="font-display text-2xl text-foreground">
                {zone.name}
              </h2>
              <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground tnum">
                {zone.pairs.length} parejas
              </span>
            </div>

            {/* Parejas */}
            <ul className="grid grid-cols-2 gap-2">
              {zone.pairs.map((p) => (
                <li
                  key={p.pairId}
                  className="rounded-lg border border-border px-3 py-2 text-sm text-foreground"
                >
                  {p.label}
                </li>
              ))}
            </ul>

            {/* Posiciones (si hay partidos jugados o están congeladas) */}
            {showStandings && (
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

            {/* Partidos */}
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Partidos
            </p>
            <ul className="mt-2 space-y-1.5">
              {zone.matches.length === 0 && (
                <li className="text-sm text-muted-foreground">Sin partidos.</li>
              )}
              {zone.matches.map((m, idx) => {
                const prev = zone.matches[idx - 1]
                const showRoundHeader = isWvl && (!prev || prev.round !== m.round)
                return (
                  <li key={m.id}>
                    {showRoundHeader && (
                      <p className="mb-1 mt-2 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        Ronda {m.round}
                      </p>
                    )}
                    <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2 text-sm">
                      <span className="min-w-0 flex-1 text-foreground">
                        <span
                          className={m.winner === 'team1' ? 'font-semibold' : ''}
                        >
                          {m.team1Label}
                        </span>{' '}
                        <span className="text-muted-foreground">vs</span>{' '}
                        <span
                          className={m.winner === 'team2' ? 'font-semibold' : ''}
                        >
                          {m.team2Label}
                        </span>
                      </span>
                      <span className="flex shrink-0 items-center gap-3">
                        {m.courtId && (
                          <span className="text-xs text-muted-foreground">
                            {courtName(m.courtId)}
                          </span>
                        )}
                        {m.status === 'finished' ? (
                          <span className="font-semibold text-foreground tnum">
                            {formatScore(m)}
                          </span>
                        ) : (
                          // Casillero en blanco para anotar el resultado a mano.
                          <span className="inline-block w-20 border-b border-dashed border-muted-foreground">
                            &nbsp;
                          </span>
                        )}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )
}

/** "6-3" (games) o "6-4 3-6 7-5" (sets) para impresión. */
function formatScore(m: ZoneView['matches'][number]): string {
  if (m.scoreDetail && m.scoreDetail.length > 0) {
    return m.scoreDetail.map(([a, b]) => `${a}-${b}`).join('  ')
  }
  if (m.team1Score != null && m.team2Score != null) {
    return `${m.team1Score}-${m.team2Score}`
  }
  return ''
}
