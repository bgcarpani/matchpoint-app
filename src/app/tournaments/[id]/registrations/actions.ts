'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/supabase/auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { canManageRegistrations } from '@/lib/domain/tournament'
import {
  registerPairSchema,
  type RegisterPairInput,
} from '@/lib/validation/registration'
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

// --- Carga manual de parejas (organizer) ------------------------------------
// El organizer carga una pareja a mano (ej. inscripción que llegó por WhatsApp/DM)
// directo desde la página de inscripciones. A diferencia del alta pública
// (register_pair, anon): NO exige inscripción abierta (sirve en cualquier estado
// gestionable), NO consume el cupo de pendientes y entra ACEPTADA directa (un solo
// paso). Respeta el tope `max_pairs`. No manda mail automático (igual que aceptar
// en el Slice 6): el aviso queda a cargo del organizer con los botones existentes.

/** Recolecta los emails de los players de las parejas vigentes del torneo. */
async function takenEmails(
  admin: Client,
  tournamentId: string
): Promise<Set<string>> {
  const { data: existing } = await admin
    .from('pairs')
    .select('player1_id, player2_id')
    .eq('tournament_id', tournamentId)
    .in('status', ['pending', 'accepted'])

  const ids = (existing ?? []).flatMap((p) => [p.player1_id, p.player2_id])
  if (!ids.length) return new Set()

  const { data: players } = await admin
    .from('players')
    .select('email')
    .in('id', ids)

  return new Set(
    (players ?? [])
      .map((p) => p.email?.trim().toLowerCase())
      .filter((e): e is string => !!e)
  )
}

export async function addPairManually(
  input: RegisterPairInput
): Promise<ActionResult> {
  const parsed = registerPairSchema.safeParse(input)
  if (!parsed.success)
    return { error: parsed.error.issues[0]?.message ?? 'Datos inválidos.' }
  const { tournament_id, player1, player2 } = parsed.data

  const { supabase } = await requireUser()

  // Verifica propiedad + estado: RLS (tournaments) scopea a los torneos del
  // organizer, así que si la lectura devuelve la fila, es suya.
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('status, max_pairs')
    .eq('id', tournament_id)
    .maybeSingle()
  if (!tournament) return { error: 'No se encontró el torneo.' }
  if (!canManageRegistrations(tournament.status)) return { error: LOCKED_MSG }

  // Entra aceptada → respeta el cupo real del torneo (max_pairs sobre accepted).
  const { count } = await supabase
    .from('pairs')
    .select('id', { count: 'exact', head: true })
    .eq('tournament_id', tournament_id)
    .eq('status', 'accepted')
  if (count != null && count >= tournament.max_pairs)
    return { error: 'Se alcanzó el cupo de parejas del torneo.' }

  // Inserción con service-role: `players` no tiene policy de INSERT para
  // authenticated (la base se carga vía RPC/admin). La propiedad ya se validó.
  const admin = createAdminClient()

  // Anti-duplicado por email (espeja register_pair): evita cargar dos veces al
  // mismo jugador. Solo aplica a los emails efectivamente cargados.
  const newEmails = [player1.email, player2.email]
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
  if (newEmails.length) {
    const taken = await takenEmails(admin, tournament_id)
    if (newEmails.some((e) => taken.has(e)))
      return { error: 'Ya hay una inscripción vigente con ese email.' }
  }

  // Inserts separados (no batch) para garantizar qué id es player1 vs player2:
  // player1 es el contacto principal y el orden de un insert múltiple no está
  // garantizado por PostgREST.
  const toRow = (p: typeof player1) => ({
    full_name: p.full_name,
    email: p.email || null,
    phone: p.phone || null,
    dni: p.dni || null,
  })
  const { data: p1, error: e1 } = await admin
    .from('players')
    .insert(toRow(player1))
    .select('id')
    .single()
  if (e1 || !p1) return { error: 'No se pudieron cargar los jugadores.' }

  const { data: p2, error: e2 } = await admin
    .from('players')
    .insert(toRow(player2))
    .select('id')
    .single()
  if (e2 || !p2) {
    await admin.from('players').delete().eq('id', p1.id)
    return { error: 'No se pudieron cargar los jugadores.' }
  }

  const token = crypto.randomUUID().replace(/-/g, '')
  const { error: pairError } = await admin.from('pairs').insert({
    tournament_id,
    player1_id: p1.id,
    player2_id: p2.id,
    lookup_token: token,
    status: 'accepted',
  })
  if (pairError) {
    // Limpia los players huérfanos si falló la creación de la pareja.
    await admin.from('players').delete().in('id', [p1.id, p2.id])
    return { error: 'No se pudo crear la pareja.' }
  }

  revalidate(tournament_id)
  return { ok: true }
}
