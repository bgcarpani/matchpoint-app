'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/supabase/auth'
import { zoneErrorLabel } from '@/lib/domain/zone'

export type ActionResult = { error: string } | { ok: true }

function revalidate(tournamentId: string) {
  revalidatePath(`/tournaments/${tournamentId}/zones`)
  revalidatePath(`/tournaments/${tournamentId}`)
  revalidatePath(`/t/${tournamentId}`)
  revalidatePath(`/t/${tournamentId}/zones`)
}

/** Genera (o regenera) zonas al azar + partidos round-robin vía RPC. */
export async function generateZones(
  tournamentId: string,
  numZones: number
): Promise<ActionResult> {
  if (!Number.isInteger(numZones) || numZones < 1) {
    return { error: 'La cantidad de zonas no es válida.' }
  }
  const { supabase } = await requireUser()
  const { error } = await supabase.rpc('generate_zones', {
    p_tournament_id: tournamentId,
    p_num_zones: numZones,
  })
  if (error) return { error: zoneErrorLabel(error.message) }

  revalidate(tournamentId)
  return { ok: true }
}

/** Reasigna una pareja a otra zona (antes de publicar) y regenera sus partidos. */
export async function movePair(
  tournamentId: string,
  pairId: string,
  targetZoneId: string
): Promise<ActionResult> {
  const { supabase } = await requireUser()
  const { error } = await supabase.rpc('move_pair_to_zone', {
    p_pair_id: pairId,
    p_target_zone_id: targetZoneId,
  })
  if (error) return { error: zoneErrorLabel(error.message) }

  revalidate(tournamentId)
  return { ok: true }
}

/**
 * Asigna (o quita) la cancha de un partido. Editable en cualquier momento,
 * incluso con las zonas publicadas (spec). Valida que la cancha sea del
 * organizador antes de actualizar; la RLS (matches_all_owner) protege la fila.
 */
export async function assignCourt(
  tournamentId: string,
  matchId: string,
  courtId: string | null
): Promise<ActionResult> {
  const { supabase, user } = await requireUser()

  if (courtId) {
    const { data: court } = await supabase
      .from('courts')
      .select('id')
      .eq('id', courtId)
      .eq('organizer_id', user.id)
      .maybeSingle()
    if (!court) return { error: 'La cancha no es de tu establecimiento.' }
  }

  const { error } = await supabase
    .from('matches')
    .update({ court_id: courtId })
    .eq('id', matchId)
  if (error) return { error: 'No se pudo asignar la cancha.' }

  revalidate(tournamentId)
  return { ok: true }
}

/**
 * Publica las zonas del torneo: las hace visibles públicamente. Una vez
 * publicadas no se pueden regenerar ni reasignar parejas (lo enforce la RPC y
 * la propia UI). La RLS del dueño permite el update.
 */
export async function publishZones(
  tournamentId: string
): Promise<ActionResult> {
  const { supabase } = await requireUser()

  const { count } = await supabase
    .from('zones')
    .select('id', { count: 'exact', head: true })
    .eq('tournament_id', tournamentId)
  if (!count) return { error: 'Generá las zonas antes de publicarlas.' }

  const { error } = await supabase
    .from('zones')
    .update({ is_published: true })
    .eq('tournament_id', tournamentId)
  if (error) return { error: 'No se pudieron publicar las zonas.' }

  revalidate(tournamentId)
  return { ok: true }
}
