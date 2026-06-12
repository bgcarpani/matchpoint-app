import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { OrganizerHeader } from '@/components/organizer/organizer-header'
import { TournamentForm } from '@/components/tournaments/tournament-form'

export const metadata: Metadata = { title: 'Nuevo torneo — Matchpoint' }

export default async function NewTournamentPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: organizer } = await supabase
    .from('organizers')
    .select('establishment_name')
    .eq('id', user.id)
    .single()

  return (
    <div className="relative z-[2] mx-auto w-full max-w-2xl px-5 py-8 sm:px-8">
      <OrganizerHeader establishmentName={organizer?.establishment_name} />

      <section className="mt-10">
        <Link
          href="/dashboard"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Volver al panel
        </Link>
        <h1 className="font-display mt-4 text-[clamp(2rem,6vw,3.5rem)] text-foreground">
          Nuevo torneo
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Se crea en estado borrador. Vas a poder editarlo y avanzarlo cuando
          esté listo.
        </p>

        <div className="mt-8">
          <TournamentForm />
        </div>
      </section>
    </div>
  )
}
