import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { requireApprovedOrganizer } from '@/lib/supabase/auth'
import { OrganizerHeader } from '@/components/organizer/organizer-header'
import { TournamentForm } from '@/components/tournaments/tournament-form'

export const metadata: Metadata = { title: 'Editar torneo — MatchUp' }

export default async function EditTournamentPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { supabase, user } = await requireApprovedOrganizer()

  const [{ data: organizer }, { data: t }] = await Promise.all([
    supabase
      .from('organizers')
      .select('establishment_name, theme_key, logo_path')
      .eq('id', user.id)
      .single(),
    supabase.from('tournaments').select('*').eq('id', id).single(),
  ])

  if (!t) notFound()
  // Sólo se edita en borrador (evita cambiar categoría/cupos con inscripciones).
  if (t.status !== 'draft') redirect(`/tournaments/${t.id}`)

  return (
    <div className="relative z-[2] mx-auto w-full max-w-2xl px-5 py-8 sm:px-8">
      <OrganizerHeader establishmentName={organizer?.establishment_name} themeKey={organizer?.theme_key} logoPath={organizer?.logo_path} />

      <section className="mt-10">
        <Link
          href={`/tournaments/${t.id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Volver al torneo
        </Link>
        <h1 className="font-display mt-4 text-[clamp(2rem,6vw,3.5rem)] text-foreground">
          Editar torneo
        </h1>

        <div className="mt-8">
          <TournamentForm tournament={t} />
        </div>
      </section>
    </div>
  )
}
