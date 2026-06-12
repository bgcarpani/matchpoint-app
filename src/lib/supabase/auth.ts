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
