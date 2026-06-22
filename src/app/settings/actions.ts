'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/supabase/auth'
import { settingsSchema, type SettingsInput } from '@/lib/validation/settings'
import { ORG_LOGOS_BUCKET, logoPath } from '@/lib/branding/logo'

export type ActionResult = { error: string } | { ok: true }

/** Revalida las superficies donde se ve el branding del organizador. */
function revalidateBranding() {
  revalidatePath('/settings')
  revalidatePath('/dashboard')
}

/** Guarda dirección, link de mapa y paleta de marca. RLS: organizers_update_own. */
export async function updateOrganizerProfile(
  values: SettingsInput
): Promise<ActionResult> {
  const parsed = settingsSchema.safeParse(values)
  if (!parsed.success) return { error: 'Datos inválidos.' }

  const { supabase, user } = await requireUser()
  const { error } = await supabase
    .from('organizers')
    .update({
      address: parsed.data.address.trim() || null,
      maps_url: parsed.data.maps_url.trim() || null,
      theme_key: parsed.data.theme_key,
    })
    .eq('id', user.id)
  if (error) return { error: 'No se pudo guardar la configuración.' }

  revalidateBranding()
  return { ok: true }
}

/**
 * Persiste que el organizador tiene logo. El archivo ya lo subió el cliente al
 * bucket (path canónico {uid}/logo); acá sólo seteamos `logo_path`.
 */
export async function confirmLogo(): Promise<ActionResult> {
  const { supabase, user } = await requireUser()
  const { error } = await supabase
    .from('organizers')
    .update({ logo_path: logoPath(user.id) })
    .eq('id', user.id)
  if (error) return { error: 'No se pudo guardar el logo.' }

  revalidateBranding()
  return { ok: true }
}

/** Quita el logo: borra el objeto de Storage y limpia `logo_path`. */
export async function removeLogo(): Promise<ActionResult> {
  const { supabase, user } = await requireUser()
  // El borrado del objeto respeta la policy de escritura (path namespaceado).
  await supabase.storage.from(ORG_LOGOS_BUCKET).remove([logoPath(user.id)])
  const { error } = await supabase
    .from('organizers')
    .update({ logo_path: null })
    .eq('id', user.id)
  if (error) return { error: 'No se pudo quitar el logo.' }

  revalidateBranding()
  return { ok: true }
}
