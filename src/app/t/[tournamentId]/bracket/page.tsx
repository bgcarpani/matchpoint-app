import Link from 'next/link'
import type { Metadata } from 'next'
import { getPublicTournament } from '@/lib/public/tournament'
import { getPublicBracket } from '@/lib/public/bracket'

export const metadata: Metadata = { title: 'Llaves — Matchpoint' }

export default async function PublicBracketPage({
  params,
}: {
  params: Promise<{ tournamentId: string }>
}) {
  const { tournamentId } = await params
  const [tournament, bracket] = await Promise.all([
    getPublicTournament(tournamentId),
    getPublicBracket(tournamentId),
  ])

  const available = bracket && bracket.rounds.length > 0

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
          Llaves
        </h1>
        {tournament && (
          <p className="mt-2 text-sm text-muted-foreground">{tournament.name}</p>
        )}
      </section>

      {!available ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border bg-card/20 p-12 text-center">
          <p className="text-foreground">Las llaves todavía no están disponibles.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            El organizador las va a publicar una vez sorteado el cuadro. Volvé a
            entrar más tarde.
          </p>
        </div>
      ) : (
        <>
          {bracket!.champion && (
            <div className="mt-8 rounded-2xl border border-volt/40 bg-volt/5 p-6 text-center">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Campeón
              </p>
              <p className="font-display mt-1 text-3xl text-foreground">
                {bracket!.champion}
              </p>
            </div>
          )}

          <div className="mt-10 space-y-8">
            {bracket!.rounds.map((round) => (
              <section key={round.round}>
                <h2 className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {round.label}
                </h2>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {round.matches.map((m) => (
                    <article
                      key={m.id}
                      className="rounded-xl border border-border bg-card/40 p-4 text-sm"
                    >
                      <TeamLine label={m.team1Label} isWinner={m.winner === 'team1'} />
                      <div className="my-1 flex items-center justify-center gap-2">
                        <span className="text-[0.7rem] uppercase tracking-[0.14em] text-muted-foreground">
                          vs
                        </span>
                        {m.score && (
                          <span className="rounded-md bg-card px-2 py-0.5 text-xs font-semibold text-foreground tnum ring-1 ring-border">
                            {m.score}
                          </span>
                        )}
                      </div>
                      <TeamLine label={m.team2Label} isWinner={m.winner === 'team2'} />
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </>
      )}
    </main>
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
          : 'italic text-muted-foreground'
      }
    >
      {label ?? 'A definir'}
    </p>
  )
}
