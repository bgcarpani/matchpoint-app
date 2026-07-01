'use server'

import { revalidatePath } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  shiftSchema,
  normalizeWhatsapp,
  normalizeInstagram,
  type ShiftInput,
} from '@/lib/validation/shift'
import type { ShiftStatus } from '@/lib/types/database'

export type CreateShiftResult =
  | { error: string }
  | { id: string; manage_token: string }

export type MutateShiftResult = { error: string } | { ok: true }

/** Limpia el input validado a las columnas de la tabla (normaliza contactos). */
function toRow(data: ShiftInput) {
  return {
    court_name: data.court_name,
    start_time: data.start_time,
    slots_needed: data.slots_needed,
    category: data.category?.trim() || null,
    notes: data.notes?.trim() || null,
    creator_name: data.creator_name,
    whatsapp: normalizeWhatsapp(data.whatsapp),
    instagram: data.instagram ? normalizeInstagram(data.instagram) || null : null,
  }
}

/**
 * Crea un turno. Corre con el admin client (no hay política de INSERT para anon).
 * Devuelve el `manage_token` para que el cliente redirija a la edición y lo guarde
 * en localStorage.
 */
export async function createShift(
  input: ShiftInput
): Promise<CreateShiftResult> {
  const parsed = shiftSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('shifts')
    .insert(toRow(parsed.data))
    .select('id, manage_token')
    .single()

  if (error || !data) {
    return { error: 'No se pudo publicar el turno. Intentá de nuevo.' }
  }

  revalidatePath('/turnos')
  return { id: data.id, manage_token: data.manage_token }
}

/**
 * Actualiza los campos de un turno. Valida el `manage_token` dentro del UPDATE:
 * si no coincide, no afecta ninguna fila y devolvemos error.
 */
export async function updateShift(
  id: string,
  token: string,
  input: ShiftInput
): Promise<MutateShiftResult> {
  const parsed = shiftSchema.safeParse(input)
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('shifts')
    .update(toRow(parsed.data))
    .eq('id', id)
    .eq('manage_token', token)
    .select('id')

  if (error) return { error: 'No se pudo guardar el turno.' }
  if (!data || data.length === 0) {
    return { error: 'No se pudo validar el acceso a este turno.' }
  }

  revalidatePath('/turnos')
  revalidatePath(`/turnos/${id}/editar`)
  return { ok: true }
}

/** Cambia el estado del turno (open / full / closed), validando el token. */
export async function setShiftStatus(
  id: string,
  token: string,
  status: ShiftStatus
): Promise<MutateShiftResult> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('shifts')
    .update({ status })
    .eq('id', id)
    .eq('manage_token', token)
    .select('id')

  if (error) return { error: 'No se pudo actualizar el estado.' }
  if (!data || data.length === 0) {
    return { error: 'No se pudo validar el acceso a este turno.' }
  }

  revalidatePath('/turnos')
  revalidatePath(`/turnos/${id}/editar`)
  return { ok: true }
}

/** Borra el turno de forma permanente, validando el token. */
export async function deleteShift(
  id: string,
  token: string
): Promise<MutateShiftResult> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('shifts')
    .delete()
    .eq('id', id)
    .eq('manage_token', token)
    .select('id')

  if (error) return { error: 'No se pudo eliminar el turno.' }
  if (!data || data.length === 0) {
    return { error: 'No se pudo validar el acceso a este turno.' }
  }

  revalidatePath('/turnos')
  return { ok: true }
}
