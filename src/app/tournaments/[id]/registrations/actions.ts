'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/supabase/auth'
import { canManageRegistrations } from '@/lib/domain/tournament'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

export type ActionResult = { error: string } | { ok: true }

type Client = SupabaseClient<Database>

// Lee la pareja (RLS pairs_all_owner garantiza que sea del organizador) y
// revalida las vistas afectadas por un cambio de estado.
async function loadOwnedPair(supabase: Client, pairId: string) {
  const { data } = await supabase
    .from('pairs')
    .select('id, tournament_id, status')
    .eq('id', pairId)
    .maybeSingle()
  return data
}

const LOCKED_MSG =
  'El torneo ya está en curso: las inscripciones quedaron congeladas.'

// Las inscripciones se congelan cuando el torneo arranca (En curso / Finalizado).
async function tournamentLocked(
  supabase: Client,
  tournamentId: string
): Promise<boolean> {
  const { data } = await supabase
    .from('tournaments')
    .select('status')
    .eq('id', tournamentId)
    .maybeSingle()
  return data ? !canManageRegistrations(data.status) : false
}

function revalidate(tournamentId: string) {
  revalidatePath(`/tournaments/${tournamentId}/registrations`)
  revalidatePath(`/tournaments/${tournamentId}`)
  revalidatePath(`/t/${tournamentId}`)
}

export async function acceptPair(pairId: string): Promise<ActionResult> {
  const { supabase } = await requireUser()
  const pair = await loadOwnedPair(supabase, pairId)
  if (!pair) return { error: 'No se encontró la solicitud.' }
  if (await tournamentLocked(supabase, pair.tournament_id))
    return { error: LOCKED_MSG }

  // Guard: no aceptar más parejas que max_pairs.
  const [{ data: tournament }, { count }] = await Promise.all([
    supabase
      .from('tournaments')
      .select('max_pairs')
      .eq('id', pair.tournament_id)
      .maybeSingle(),
    supabase
      .from('pairs')
      .select('id', { count: 'exact', head: true })
      .eq('tournament_id', pair.tournament_id)
      .eq('status', 'accepted'),
  ])

  if (pair.status !== 'accepted' && tournament && count != null && count >= tournament.max_pairs) {
    return { error: 'Se alcanzó el cupo de parejas del torneo.' }
  }

  const { error } = await supabase
    .from('pairs')
    .update({ status: 'accepted' })
    .eq('id', pairId)
  if (error) return { error: 'No se pudo aceptar la solicitud.' }

  revalidate(pair.tournament_id)
  return { ok: true }
}

export async function rejectPair(pairId: string): Promise<ActionResult> {
  const { supabase } = await requireUser()
  const pair = await loadOwnedPair(supabase, pairId)
  if (!pair) return { error: 'No se encontró la solicitud.' }
  if (await tournamentLocked(supabase, pair.tournament_id))
    return { error: LOCKED_MSG }

  const { error } = await supabase
    .from('pairs')
    .update({ status: 'rejected' })
    .eq('id', pairId)
  if (error) return { error: 'No se pudo rechazar la solicitud.' }

  revalidate(pair.tournament_id)
  return { ok: true }
}

export async function removePair(pairId: string): Promise<ActionResult> {
  const { supabase } = await requireUser()
  const pair = await loadOwnedPair(supabase, pairId)
  if (!pair) return { error: 'No se encontró la solicitud.' }
  if (await tournamentLocked(supabase, pair.tournament_id))
    return { error: LOCKED_MSG }

  // remove_pair (0004) borra la pareja y sus players, con chequeo de propiedad.
  const { error } = await supabase.rpc('remove_pair', { p_pair_id: pairId })
  if (error) return { error: 'No se pudo remover la pareja.' }

  revalidate(pair.tournament_id)
  return { ok: true }
}
