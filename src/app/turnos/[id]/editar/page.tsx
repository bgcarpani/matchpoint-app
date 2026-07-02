import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import { EditShiftForm } from '../../components/edit-shift-form'

export const metadata = {
  title: 'Gestionar turno — MatchUp',
}

export default async function EditarTurnoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ token?: string; nuevo?: string }>
}) {
  const { id } = await params
  const { token, nuevo } = await searchParams

  if (!token) redirect('/turnos?error=acceso')

  // Validación del token dentro de la query: sin match no hay fila y no hay acceso.
  const supabase = createAdminClient()
  const { data: shift } = await supabase
    .from('shifts')
    .select(
      'id, court_name, start_time, slots_needed, category, notes, creator_name, whatsapp, instagram, status'
    )
    .eq('id', id)
    .eq('manage_token', token)
    .maybeSingle()

  if (!shift) redirect('/turnos?error=acceso')

  return (
    <main>
      <EditShiftForm shift={shift} token={token} justCreated={nuevo === '1'} />
    </main>
  )
}
