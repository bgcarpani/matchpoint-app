import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { OrganizerHeader } from '@/components/organizer/organizer-header'
import { TournamentStatusBadge } from '@/components/tournaments/tournament-status-badge'
import { LifecycleControls } from '@/components/tournaments/lifecycle-controls'
import {
  categoryLabel,
  canManageZones,
  CATEGORY_TYPE_LABELS,
  GENDER_LABELS,
} from '@/lib/domain/tournament'
import { formatDate, formatDateTime } from '@/lib/format'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const metadata: Metadata = { title: 'Torneo — Matchpoint' }

export default async function TournamentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: organizer }, { data: t }] = await Promise.all([
    supabase
      .from('organizers')
      .select('establishment_name')
      .eq('id', user.id)
      .single(),
    supabase.from('tournaments').select('*').eq('id', id).single(),
  ])

  if (!t) notFound()

  const isDraft = t.status === 'draft'
  const zonesReady = canManageZones(t.status)

  return (
    <div className="relative z-[2] mx-auto w-full max-w-4xl px-5 py-8 sm:px-8">
      <OrganizerHeader establishmentName={organizer?.establishment_name} />

      <section className="mt-10">
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Volver al panel
        </Link>

        <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <TournamentStatusBadge status={t.status} />
            <h1 className="font-display mt-3 text-[clamp(2rem,7vw,4rem)] text-foreground">
              {t.name}
            </h1>
          </div>
          {isDraft && (
            <Link
              href={`/tournaments/${t.id}/edit`}
              className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'h-11')}
            >
              Editar
            </Link>
          )}
        </div>

        {/* Ciclo de vida */}
        <div className="mt-8 rounded-2xl border border-border bg-card/40 p-6">
          <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Ciclo de vida
          </h2>
          <div className="mt-4">
            <LifecycleControls tournamentId={t.id} status={t.status} />
          </div>
        </div>

        {/* Detalles */}
        <div className="mt-4 rounded-2xl border border-border bg-card/40 p-6 sm:p-8">
          <h2 className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
            Detalles
          </h2>
          <dl className="mt-5 divide-y divide-border">
            <Row label="Categoría" value={categoryLabel(t.category_type, t.category_value)} />
            <Row label="Tipo" value={CATEGORY_TYPE_LABELS[t.category_type]} />
            <Row label="Género" value={GENDER_LABELS[t.gender]} />
            <Row label="Fecha" value={formatDate(t.tournament_date)} />
            <Row
              label="Apertura de inscripción"
              value={
                t.registration_opens_at
                  ? formatDateTime(t.registration_opens_at)
                  : 'Apertura manual'
              }
            />
            <Row label="Cupos del torneo" value={`${t.max_pairs} parejas`} />
            <Row
              label="Cupos de solicitud"
              value={`${t.max_pair_requests} parejas`}
            />
          </dl>
        </div>

        {/* Próximos slices */}
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <SectionPlaceholder
            title="Inscripciones"
            note="Aceptar o rechazar parejas. (Próximo slice)"
          />
          <SectionPlaceholder
            title="Zonas y partidos"
            note={
              zonesReady
                ? 'Disponible al cerrar la inscripción. (Próximo slice)'
                : 'Se habilita cuando la inscripción esté cerrada.'
            }
          />
        </div>
      </section>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-3.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="text-right text-sm font-medium text-foreground">
        {value}
      </dd>
    </div>
  )
}

function SectionPlaceholder({ title, note }: { title: string; note: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/20 p-6">
      <h3 className="font-display text-lg text-foreground/70">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{note}</p>
    </div>
  )
}
