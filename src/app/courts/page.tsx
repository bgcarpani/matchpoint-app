import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { OrganizerHeader } from '@/components/organizer/organizer-header'
import { CourtsManager } from '@/components/courts/courts-manager'

export const metadata: Metadata = { title: 'Canchas — Matchpoint' }

export default async function CourtsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: organizer }, { data: courts }] = await Promise.all([
    supabase
      .from('organizers')
      .select('establishment_name')
      .eq('id', user.id)
      .single(),
    // Defensa en profundidad: `courts` hoy sólo tiene la policy del dueño
    // (courts_all_own), así que la RLS ya acota; filtramos por organizer_id
    // explícito igual, por consistencia con el resto del área organizer.
    supabase
      .from('courts')
      .select('*')
      .eq('organizer_id', user.id)
      .order('created_at', { ascending: true }),
  ])

  return (
    <div className="relative z-[2] mx-auto w-full max-w-4xl px-5 py-8 sm:px-8">
      <OrganizerHeader establishmentName={organizer?.establishment_name} />

      <section className="mt-10">
        <h1 className="font-display text-[clamp(2rem,6vw,3.5rem)] text-foreground">
          Canchas
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Las canchas de tu establecimiento. Después las vas a poder asignar a
          los partidos de cada torneo.
        </p>

        <div className="mt-8">
          <CourtsManager courts={courts ?? []} />
        </div>
      </section>
    </div>
  )
}
