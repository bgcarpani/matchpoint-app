import type { Metadata } from 'next'
import { requireApprovedOrganizer } from '@/lib/supabase/auth'
import { OrganizerHeader } from '@/components/organizer/organizer-header'
import { SettingsForm } from '@/components/organizer/settings-form'

export const metadata: Metadata = { title: 'Configuración — Matchpoint' }

export default async function SettingsPage() {
  const { supabase, user } = await requireApprovedOrganizer()

  const { data: organizer } = await supabase
    .from('organizers')
    .select('establishment_name, theme_key, logo_path, address, maps_url')
    .eq('id', user.id)
    .single()

  return (
    <div className="relative z-[2] mx-auto w-full max-w-3xl px-5 py-8 sm:px-8">
      <OrganizerHeader
        establishmentName={organizer?.establishment_name}
        themeKey={organizer?.theme_key}
        logoPath={organizer?.logo_path}
      />

      <section className="mt-10">
        <h1 className="font-display text-[clamp(2rem,6vw,3.5rem)] text-foreground">
          Configuración
        </h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          La identidad de tu organización: logo, ubicación y colores. Se ve en tu
          panel y en las páginas públicas que ven los jugadores.
        </p>

        <div className="mt-8">
          <SettingsForm
            organizerId={user.id}
            establishmentName={organizer?.establishment_name ?? null}
            initialLogoPath={organizer?.logo_path ?? null}
            initialAddress={organizer?.address ?? ''}
            initialMapsUrl={organizer?.maps_url ?? ''}
            initialThemeKey={organizer?.theme_key ?? 'royal'}
          />
        </div>
      </section>
    </div>
  )
}
