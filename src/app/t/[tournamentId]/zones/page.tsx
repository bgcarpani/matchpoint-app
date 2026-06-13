import Link from 'next/link'
import type { Metadata } from 'next'
import { getPublicTournament } from '@/lib/public/tournament'
import { getPublicZones } from '@/lib/public/zones'
import { ZoneStandings } from '@/components/zones/zone-standings'

export const metadata: Metadata = { title: 'Zonas y partidos — Matchpoint' }

export default async function PublicZonesPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>
}) {
  const { tournamentId } = await params
  const [tournament, zones] = await Promise.all([
    getPublicTournament(tournamentId),
    getPublicZones(tournamentId),
  ])

  const available = zones && zones.length > 0

  return (
    <main className="relative z-[2] mx-auto w-full max-w-5xl px-5 pb-24 sm:px-8">
      <header className="flex items-center justify-between py-6">
        <span className="font-display text-lg text-foreground">
          Match<span className="text-volt">point</span>
        </span>
        {tournament && (
          <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {tournament.establishment_name}
          </span>
        )}
      </header>

      <section className="mt-2">
        {tournament && (
          <Link
            href={`/t/${tournamentId}`}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Volver al torneo
          </Link>
        )}
        <h1 className="font-display mt-4 text-[clamp(2.25rem,7vw,4.5rem)] text-foreground">
          Zonas y partidos
        </h1>
        {tournament && (
          <p className="mt-2 text-sm text-muted-foreground">{tournament.name}</p>
        )}
      </section>

      {!available ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border bg-card/20 p-12 text-center">
          <p className="text-foreground">Las zonas todavía no están disponibles.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            El organizador las va a publicar una vez sorteadas. Volvé a entrar más
            tarde.
          </p>
        </div>
      ) : (
        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {zones!.map((zone) => (
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
                  <li className="text-sm text-muted-foreground">
                    Sin partidos.
                  </li>
                )}
                {zone.matches.map((m) => (
                  <li
                    key={m.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-sm"
                  >
                    <span className="text-foreground">
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
            </article>
          ))}
        </div>
      )}
    </main>
  )
}
