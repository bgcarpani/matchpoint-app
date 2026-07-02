import { redirect } from 'next/navigation'
import { createClient } from './server'

/**
 * Helper para server actions del área de organizador: devuelve el cliente
 * Supabase (ligado a la sesión) y el usuario autenticado, o lanza si no hay sesión.
 * La autorización fina la aplica RLS en cada query.
 */
export async function requireUser() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('No autenticado')
  return { supabase, user }
}

/**
 * Helper para PÁGINAS del área de organizador: exige sesión (→ /login) y
 * cuenta aprobada (→ /pending). El gate duro es RLS (is_approved_organizer()
 * en el with check de courts/tournaments); esto es la capa de UX.
 */
export async function requireApprovedOrganizer() {
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
  if (organizer?.status !== 'approved') redirect('/pending')

  return { supabase, user }
}
