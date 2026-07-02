'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/supabase/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { isPlatformAdmin } from '@/lib/admin'

/**
 * Aprueba o rechaza una solicitud de cuenta de organizador.
 * Sólo el admin de la plataforma; el update corre con admin client porque
 * organizers_update_own no deja tocar filas ajenas.
 */
export async function reviewOrganizer(
  organizerId: string,
  decision: 'approved' | 'rejected'
): Promise<void> {
  const { user } = await requireUser()
  if (!isPlatformAdmin(user.id)) throw new Error('No autorizado')
  if (decision !== 'approved' && decision !== 'rejected')
    throw new Error('Decisión inválida')

  const admin = createAdminClient()
  const { error } = await admin
    .from('organizers')
    .update({ status: decision, reviewed_at: new Date().toISOString() })
    .eq('id', organizerId)
  if (error) throw new Error('No se pudo guardar la revisión.')

  revalidatePath('/admin')
}
