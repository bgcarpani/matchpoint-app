import Link from 'next/link'
import type { Metadata } from 'next'
import { getPublicTournament } from '@/lib/public/tournament'
import { getPublicBracket } from '@/lib/public/bracket'
import { PublicBracketView } from '@/components/bracket/public-bracket-view'
import { ThemeStyle } from '@/components/branding/theme-style'
import { logoPublicUrl } from '@/lib/branding/logo'

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
  const logoUrl = logoPublicUrl(tournament?.logo_path ?? null)

  return (
    <main className="relative z-[2] mx-auto w-full max-w-5xl px-5 pb-24 sm:px-8">
      <ThemeStyle themeKey={tournament?.theme_key} />
      <header className="flex items-center justify-between py-6">
        <span className="font-display text-lg text-foreground">
          Match<span className="text-volt">point</span>
        </span>
        {tournament && (
          <span className="flex items-center gap-2.5 text-xs uppercase tracking-[0.2em] text-muted-foreground">
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- logo del CDN de Storage
              <img
                src={logoUrl}
                alt=""
                className="size-7 rounded-full border border-border object-cover"
              />
            )}
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

          <PublicBracketView
            rounds={bracket!.rounds}
            scoringMode={bracket!.scoringMode}
          />
        </>
      )}
    </main>
  )
}
