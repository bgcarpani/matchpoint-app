import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { requireApprovedOrganizer } from '@/lib/supabase/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { isPlatformAdmin } from '@/lib/admin'
import { OrganizerHeader } from '@/components/organizer/organizer-header'
import { Button } from '@/components/ui/button'
import { formatDateTime } from '@/lib/format'
import { reviewOrganizer } from './actions'

export const metadata: Metadata = { title: 'Solicitudes — MatchUp' }

export default async function AdminPage() {
  const { supabase, user } = await requireApprovedOrganizer()
  // 404 para cualquiera que no sea admin de la plataforma (no revela que existe).
  if (!isPlatformAdmin(user.id)) notFound()

  const admin = createAdminClient()
  const [{ data: organizer }, { data: pending }] = await Promise.all([
    supabase
      .from('organizers')
      .select('establishment_name, theme_key, logo_path')
      .eq('id', user.id)
      .single(),
    // Las solicitudes ajenas sólo se ven con admin client (RLS es owner-only).
    admin
      .from('organizers')
      .select('id, email, full_name, establishment_name, created_at')
      .eq('status', 'pending')
      .order('created_at', { ascending: true }),
  ])

  const list = pending ?? []

  return (
    <div className="relative z-[2] mx-auto w-full max-w-4xl px-5 py-8 sm:px-8">
      <OrganizerHeader
        establishmentName={organizer?.establishment_name}
        themeKey={organizer?.theme_key}
        logoPath={organizer?.logo_path}
      />

      <section className="mt-10">
        <h1 className="font-display text-[clamp(2rem,6vw,3.5rem)] text-foreground">
          Solicitudes
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Cuentas de organizador esperando aprobación. Al aprobar, la persona ya
          puede crear canchas y torneos (no se le avisa por email todavía).
        </p>

        <div className="mt-8 grid gap-3">
          {list.length === 0 && (
            <div className="rounded-xl border border-border bg-card px-5 py-8 text-center text-sm text-muted-foreground elevate">
              No hay solicitudes pendientes.
            </div>
          )}

          {list.map((org) => (
            <div
              key={org.id}
              className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 elevate sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-display text-lg text-foreground">
                  {org.establishment_name}
                </p>
                <p className="mt-1 truncate text-sm text-muted-foreground">
                  {org.full_name} · {org.email}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Solicitó el {formatDateTime(org.created_at)}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <form action={reviewOrganizer.bind(null, org.id, 'approved')}>
                  <Button type="submit" size="sm" className="font-display">
                    Aprobar
                  </Button>
                </form>
                <form action={reviewOrganizer.bind(null, org.id, 'rejected')}>
                  <Button
                    type="submit"
                    size="sm"
                    variant="outline"
                    className="font-display text-destructive"
                  >
                    Rechazar
                  </Button>
                </form>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
