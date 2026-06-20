import Link from 'next/link'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { OrganizerHeader } from '@/components/organizer/organizer-header'
import { CalendarSharePanel } from '@/components/organizer/calendar-share-panel'
import { TournamentCard } from '@/components/tournaments/tournament-card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Panel — Matchpoint' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Defensa real (el proxy es sólo optimista, ver docs Next 16).
  if (!user) redirect('/login')

  const [{ data: organizer }, { data: tournaments }] = await Promise.all([
    supabase
      .from('organizers')
      .select('full_name, establishment_name, calendar_slug')
      .eq('id', user.id)
      .single(),
    // Filtrar por dueño explícitamente: la policy tournaments_public_read deja
    // leer a cualquier `authenticated` los torneos no-draft, así que NO alcanza
    // con confiar en RLS para acotar la lista a los del organizador logueado.
    supabase
      .from('tournaments')
      .select('*')
      .eq('organizer_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  const list = tournaments ?? []

  // URL pública absoluta del calendario (sirve en local y prod).
  const h = await headers()
  const host = h.get('host') ?? ''
  const proto =
    h.get('x-forwarded-proto') ??
    (host.startsWith('localhost') ? 'http' : 'https')
  const calendarUrl = organizer?.calendar_slug
    ? `${proto}://${host}/o/${organizer.calendar_slug}`
    : null

  return (
    <div className="relative z-[2] mx-auto w-full max-w-6xl px-5 py-8 sm:px-8">
      <OrganizerHeader establishmentName={organizer?.establishment_name} />

      {calendarUrl && (
        <section className="mt-8">
          <CalendarSharePanel
            url={calendarUrl}
            establishmentName={organizer?.establishment_name}
          />
        </section>
      )}

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">
              Hola{organizer?.full_name ? `, ${organizer.full_name}` : ''} 👋
            </p>
            <h1 className="font-display mt-2 text-[clamp(2rem,6vw,3.5rem)] text-foreground">
              Tus torneos
            </h1>
          </div>
          <Link
            href="/tournaments/new"
            className={cn(
              buttonVariants({ size: 'lg' }),
              'font-display h-12 px-5 text-base'
            )}
          >
            Crear torneo →
          </Link>
        </div>

        {list.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-dashed border-border bg-card/30 p-10 text-center">
            <p className="text-foreground">Todavía no creaste ningún torneo.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Empezá creando tu primer torneo desde el botón de arriba.
            </p>
          </div>
        ) : (
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((t) => (
              <TournamentCard key={t.id} tournament={t} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
