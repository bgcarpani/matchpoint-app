import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import {
  getActiveTournaments,
  getPublicOrganizerBySlug,
  type CalendarTournament,
} from '@/lib/public/calendar'
import {
  GENDER_LABELS,
  STATUS_LABELS,
  categoryLabel,
} from '@/lib/domain/tournament'
import { ThemeStyle } from '@/components/branding/theme-style'
import { logoPublicUrl } from '@/lib/branding/logo'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const organizer = await getPublicOrganizerBySlug(slug)
  return {
    title: organizer
      ? `${organizer.establishment_name} — Torneos`
      : 'Calendario de torneos — Matchpoint',
  }
}

export default async function PublicCalendarPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const organizer = await getPublicOrganizerBySlug(slug)
  // Slug inexistente → 404. Slug válido sin torneos → encabezado + empty state.
  if (!organizer) notFound()

  const tournaments = await getActiveTournaments(organizer.id)
  const logoUrl = logoPublicUrl(organizer.logo_path)

  return (
    <main className="relative z-[2] mx-auto w-full max-w-4xl px-5 pb-24 sm:px-8">
      <ThemeStyle themeKey={organizer.theme_key} />
      {/* Top bar */}
      <header className="flex items-center justify-between py-6">
        <span className="font-display text-lg text-foreground">
          Match<span className="text-volt">point</span>
        </span>
        <span className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
          Calendario de torneos
        </span>
      </header>

      {/* Hero */}
      <section className="rounded-2xl border border-border bg-card/40 px-6 py-12 sm:px-12 sm:py-16">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- logo del CDN de Storage
          <img
            src={logoUrl}
            alt={organizer.establishment_name}
            className="mb-6 size-16 rounded-2xl border border-border object-cover"
          />
        ) : (
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Torneos de
          </p>
        )}
        <h1 className="font-display mt-3 text-[clamp(2.25rem,8vw,5rem)] text-foreground">
          {organizer.establishment_name}
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          {tournaments.length > 0
            ? 'Elegí un torneo para ver los detalles e inscribirte.'
            : 'No hay torneos activos en este momento.'}
        </p>
        {organizer.address && (
          <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span>{organizer.address}</span>
            {organizer.maps_url && (
              <a
                href={organizer.maps_url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-volt hover:underline"
              >
                Cómo llegar →
              </a>
            )}
          </p>
        )}
      </section>

      {/* Lista de torneos activos */}
      {tournaments.length > 0 ? (
        <section className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {tournaments.map((t) => (
            <CalendarCard key={t.id} t={t} />
          ))}
        </section>
      ) : (
        <section className="mt-4 rounded-2xl border border-dashed border-border bg-card/30 p-10 text-center">
          <p className="text-foreground">
            No hay torneos activos en este momento.
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Volvé a escanear el código más adelante para ver los próximos.
          </p>
        </section>
      )}

      <footer className="mt-16 border-t border-border pt-6 text-center text-xs text-muted-foreground">
        Esta página se actualiza sola: siempre muestra los torneos vigentes del
        establecimiento.
      </footer>
    </main>
  )
}

function CalendarCard({ t }: { t: CalendarTournament }) {
  const isOpen = t.status === 'registration_open'
  const dateLabel = new Intl.DateTimeFormat('es-AR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${t.tournament_date}T00:00:00`))

  return (
    <Link
      href={`/t/${t.id}`}
      className="group flex flex-col rounded-2xl border border-border bg-card/40 p-6 transition-colors hover:border-volt/50 hover:bg-card/60"
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] ${
            isOpen
              ? 'bg-volt text-volt-foreground'
              : 'border border-border text-muted-foreground'
          }`}
        >
          {isOpen && (
            <span
              className="size-1.5 animate-pulse rounded-full bg-volt-foreground"
              aria-hidden
            />
          )}
          {STATUS_LABELS[t.status]}
        </span>
        <span className="text-xs uppercase tracking-[0.16em] text-muted-foreground tnum">
          {dateLabel}
        </span>
      </div>

      <h2 className="font-display mt-5 text-2xl text-foreground">{t.name}</h2>

      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-md bg-volt/10 px-2.5 py-1 font-medium text-volt ring-1 ring-volt/30">
          {categoryLabel(t.category_type, t.category_value)}
        </span>
        <span className="rounded-md bg-secondary px-2.5 py-1 font-medium text-secondary-foreground">
          {GENDER_LABELS[t.gender]}
        </span>
      </div>

      <span className="mt-6 text-sm font-medium text-volt group-hover:underline">
        Ver torneo →
      </span>
    </Link>
  )
}
