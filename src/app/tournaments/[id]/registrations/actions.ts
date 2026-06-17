'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/supabase/auth'
import { canManageRegistrations } from '@/lib/domain/tournament'
import { sendEmail } from '@/lib/email/send'
import { acceptedEmail, rejectedEmail } from '@/lib/email/templates'
import { getBaseUrl } from '@/lib/url'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/lib/types/database'

export type ActionResult = { error: string } | { ok: true }

type Client = SupabaseClient<Database>

// Lee la pareja (RLS pairs_all_owner garantiza que sea del organizador) y los
// datos necesarios para notificar cambios de estado al jugador 1. Los embeds
// anidados no resuelven (los tipos generados no declaran relaciones), así que
// se leen players/tournaments por separado, igual que en inscription.ts.
async function loadOwnedPair(supabase: Client, pairId: string) {
  const { data } = await supabase
    .from('pairs')
    .select('id, tournament_id, status, lookup_token, player1_id')
    .eq('id', pairId)
    .maybeSingle()
  return data
}

type OwnedPair = NonNullable<Awaited<ReturnType<typeof loadOwnedPair>>>

// Notifica al jugador 1 el nuevo estado de su solicitud. Best-effort: sendEmail
// no lanza, así que un fallo de envío nunca rompe el accept/reject.
async function notifyStatusChange(
  supabase: Client,
  pair: OwnedPair,
  status: 'accepted' | 'rejected'
) {
  const [{ data: player1 }, { data: tournament }] = await Promise.all([
    supabase
      .from('players')
      .select('full_name, email')
      .eq('id', pair.player1_id)
      .maybeSingle(),
    supabase
      .from('tournaments')
      .select('name')
      .eq('id', pair.tournament_id)
      .maybeSingle(),
  ])

  if (!player1?.email) return

  const baseUrl = await getBaseUrl()
  const build = status === 'accepted' ? acceptedEmail : rejectedEmail
  const { subject, html } = build({
    playerName: player1.full_name,
    tournamentName: tournament?.name ?? 'tu torneo',
    trackUrl: `${baseUrl}/inscription/${pair.lookup_token}`,
  })
  await sendEmail({ to: player1.email, subject, html })
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

  // Slice 6 (seña): aceptar ya NO manda mail automático. El aviso de aceptado +
  // pendiente de seña lo dispara el organizer a mano (notifyAcceptedByEmail /
  // botón de WhatsApp), para poder no avisar si la seña ya fue pagada.

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

  if (pair.status !== 'rejected')
    await notifyStatusChange(supabase, pair, 'rejected')

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

// --- Seña (Slice 6) ---------------------------------------------------------
// "Pendiente de seña" es un sub-estado de `accepted`: la columna deposit_paid_at
// no toca status (cupo/zonas siguen igual). El organizer marca la seña a mano.

/** Marca la seña como recibida (registra el cuándo). Solo sobre parejas propias. */
export async function markDepositPaid(pairId: string): Promise<ActionResult> {
  const { supabase } = await requireUser()
  const pair = await loadOwnedPair(supabase, pairId)
  if (!pair) return { error: 'No se encontró la solicitud.' }

  const { error } = await supabase
    .from('pairs')
    .update({ deposit_paid_at: new Date().toISOString() })
    .eq('id', pairId)
  if (error) return { error: 'No se pudo marcar la seña.' }

  revalidate(pair.tournament_id)
  return { ok: true }
}

/** Deshace la marca de seña (vuelve a "pendiente de seña"). */
export async function unmarkDepositPaid(pairId: string): Promise<ActionResult> {
  const { supabase } = await requireUser()
  const pair = await loadOwnedPair(supabase, pairId)
  if (!pair) return { error: 'No se encontró la solicitud.' }

  const { error } = await supabase
    .from('pairs')
    .update({ deposit_paid_at: null })
    .eq('id', pairId)
  if (error) return { error: 'No se pudo deshacer la seña.' }

  revalidate(pair.tournament_id)
  return { ok: true }
}

/**
 * Envía a mano el mail de "aceptada + pendiente de seña" al jugador 1. Reusa
 * `acceptedEmail` (que pasó de automático a manual en el Slice 6). Best-effort:
 * si el J1 no tiene email, no hace nada; un fallo de envío no rompe nada.
 */
export async function notifyAcceptedByEmail(
  pairId: string
): Promise<ActionResult> {
  const { supabase } = await requireUser()
  const pair = await loadOwnedPair(supabase, pairId)
  if (!pair) return { error: 'No se encontró la solicitud.' }
  if (pair.status !== 'accepted')
    return { error: 'La pareja no está aceptada.' }

  await notifyStatusChange(supabase, pair, 'accepted')
  return { ok: true }
}
