import Link from 'next/link'
import { headers } from 'next/headers'
import type { Metadata } from 'next'
import { requireApprovedOrganizer } from '@/lib/supabase/auth'
import { OrganizerHeader } from '@/components/organizer/organizer-header'
import { CalendarSharePanel } from '@/components/organizer/calendar-share-panel'
import {
  DashboardStats,
  type DashboardStat,
} from '@/components/organizer/dashboard-stats'
import { TournamentBrowser } from '@/components/tournaments/tournament-browser'
import type { TournamentRow } from '@/components/tournaments/tournament-table'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ACTIVE_CALENDAR_STATUSES } from '@/lib/domain/tournament'

export const metadata: Metadata = { title: 'Panel — MatchUp' }

const ACTIVE_STATUSES = new Set(['registration_open', 'in_progress'])

export default async function DashboardPage() {
  // Defensa real (el proxy es sólo optimista, ver docs Next 16); además exige
  // cuenta aprobada (→ /pending).
  const { supabase, user } = await requireApprovedOrganizer()

  // Lecturas en paralelo. `pairs` y `courts` vuelven filtrados por RLS al owner,
  // así que las cuentas son del organizer sin filtro extra.
  const [{ data: organizer }, { data: tournaments }, { data: pairs }, { count: courtCount }] =
    await Promise.all([
      supabase
        .from('organizers')
        .select('full_name, establishment_name, calendar_slug, theme_key, logo_path')
        .eq('id', user.id)
        .single(),
      // Filtrar por dueño explícitamente: la policy tournaments_public_read deja
      // leer a cualquier `authenticated` los torneos no-draft, así que NO alcanza
      // con confiar en RLS para acotar la lista a los del organizador logueado.
      // Orden por fecha de torneo (la fecha en que se juega), del más próximo
      // (antiguo) al más lejano; el listado permite reordenar/filtrar en el cliente.
      supabase
        .from('tournaments')
        .select('*')
        .eq('organizer_id', user.id)
        .order('tournament_date', { ascending: true }),
      supabase.from('pairs').select('tournament_id, status'),
      supabase.from('courts').select('id', { count: 'exact', head: true }),
    ])

  const list = tournaments ?? []
  const pairRows = pairs ?? []

  // Conteo de parejas aceptadas por torneo (para la columna "Parejas").
  const acceptedByTournament = new Map<string, number>()
  let acceptedTotal = 0
  let pendingTotal = 0
  for (const p of pairRows) {
    if (p.status === 'accepted') {
      acceptedTotal++
      acceptedByTournament.set(
        p.tournament_id,
        (acceptedByTournament.get(p.tournament_id) ?? 0) + 1
      )
    } else if (p.status === 'pending') {
      pendingTotal++
    }
  }

  const rows: TournamentRow[] = list.map((t) => ({
    ...t,
    acceptedCount: acceptedByTournament.get(t.id) ?? 0,
  }))

  // Meses ('YYYY-MM') con torneos vigentes, para el afiche mensual del calendario.
  // Mismos estados que `public_calendar_tournament_view` (sin draft/finished).
  const calendarMonthSet = new Set<string>()
  for (const t of list) {
    if (ACTIVE_CALENDAR_STATUSES.has(t.status)) {
      calendarMonthSet.add(t.tournament_date.slice(0, 7))
    }
  }
  const calendarMonths = [...calendarMonthSet].sort()

  const stats: DashboardStat[] = [
    { label: 'Activos', value: list.filter((t) => ACTIVE_STATUSES.has(t.status)).length },
    { label: 'Parejas', value: acceptedTotal },
    { label: 'Pendientes', value: pendingTotal, accent: 'warning' },
    { label: 'Canchas', value: courtCount ?? 0 },
  ]

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
    <div className="relative z-[2] mx-auto w-full max-w-6xl px-5 pt-6 sm:px-8">
      <OrganizerHeader establishmentName={organizer?.establishment_name} themeKey={organizer?.theme_key} logoPath={organizer?.logo_path} />

      <div className="py-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          Hola{organizer?.full_name ? `, ${organizer.full_name}` : ''} 👋
        </p>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <h1 className="font-display text-[clamp(2rem,6vw,3.25rem)] leading-[0.95] text-foreground">
            Tus torneos
          </h1>
          <Link
            href="/tournaments/new"
            className={cn(
              buttonVariants({ size: 'lg' }),
              'font-display h-11 px-5 text-base'
            )}
          >
            Crear torneo →
          </Link>
        </div>

        {/* KPIs */}
        <div className="mt-6">
          <DashboardStats stats={stats} />
        </div>

        {/* Calendario público */}
        {calendarUrl && (
          <section className="mt-4">
            <CalendarSharePanel
              url={calendarUrl}
              establishmentName={organizer?.establishment_name}
              months={calendarMonths}
            />
          </section>
        )}

        {/* Listado de torneos */}
        <section className="mt-8">
          {list.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card p-10 text-center">
              <p className="text-foreground">Todavía no creaste ningún torneo.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Empezá creando tu primer torneo desde el botón de arriba.
              </p>
            </div>
          ) : (
            <TournamentBrowser tournaments={rows} />
          )}
        </section>
      </div>
    </div>
  )
}
