import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { signOut } from '../actions'

export const metadata: Metadata = { title: 'Cuenta en revisión — MatchUp' }

export default async function PendingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: organizer } = await supabase
    .from('organizers')
    .select('status')
    .eq('id', user.id)
    .maybeSingle()
  if (organizer?.status === 'approved') redirect('/dashboard')

  return (
    <div>
      <h1 className="font-display text-3xl text-foreground">
        Tu cuenta está en revisión
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Recibimos tu solicitud para gestionar torneos en MatchUp. Estamos
        revisando las cuentas nuevas de forma manual: te avisamos por email
        apenas la aprobemos.
      </p>
      <p className="mt-2 text-sm text-muted-foreground">
        Si pasan varios días sin novedades, escribinos respondiendo el email de
        confirmación.
      </p>
      <form action={signOut} className="mt-7">
        <Button
          type="submit"
          variant="outline"
          size="lg"
          className="font-display h-12 w-full text-base"
        >
          Cerrar sesión
        </Button>
      </form>
    </div>
  )
}
