'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/supabase/auth'
import { courtSchema, type CourtInput } from '@/lib/validation/court'

export type ActionResult = { error: string } | { ok: true }

export async function createCourt(values: CourtInput): Promise<ActionResult> {
  const parsed = courtSchema.safeParse(values)
  if (!parsed.success) return { error: 'Datos inválidos.' }

  const { supabase, user } = await requireUser()
  const { error } = await supabase.from('courts').insert({
    organizer_id: user.id,
    name: parsed.data.name,
    type: parsed.data.type,
  })
  if (error) return { error: 'No se pudo crear la cancha.' }

  revalidatePath('/courts')
  return { ok: true }
}

export async function updateCourt(
  id: string,
  values: CourtInput
): Promise<ActionResult> {
  const parsed = courtSchema.safeParse(values)
  if (!parsed.success) return { error: 'Datos inválidos.' }

  const { supabase } = await requireUser()
  // RLS (courts_all_own) garantiza que sólo el dueño puede modificarla.
  const { error } = await supabase
    .from('courts')
    .update({ name: parsed.data.name, type: parsed.data.type })
    .eq('id', id)
  if (error) return { error: 'No se pudo actualizar la cancha.' }

  revalidatePath('/courts')
  return { ok: true }
}

export async function deleteCourt(id: string): Promise<ActionResult> {
  const { supabase } = await requireUser()
  // matches.court_id es ON DELETE SET NULL: borrar una cancha no elimina
  // partidos ya asignados, sólo libera la asignación.
  const { error } = await supabase.from('courts').delete().eq('id', id)
  if (error) return { error: 'No se pudo eliminar la cancha.' }

  revalidatePath('/courts')
  return { ok: true }
}
