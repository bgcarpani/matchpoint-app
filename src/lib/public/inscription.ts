/**
 * Consulta de estado de inscripción por lookup_token (sin login).
 *
 * Corre server-side con service-role (bypassea RLS) y devuelve sólo lo que el
 * dueño del token puede ver: estado de su pareja, nombres y datos del torneo.
 */
import { createAdminClient } from '@/lib/supabase/admin'
import type { PairStatus, TournamentStatus } from '@/lib/types/database'

export interface InscriptionView {
  status: PairStatus
  created_at: string
  tournament: { id: string; name: string; status: TournamentStatus }
  player1_name: string
  player2_name: string
}

export async function getInscriptionByToken(
  token: string
): Promise<InscriptionView | null> {
  // El token es hex de 32 chars (gen_random_bytes(16)); descartá lo que no calce.
  if (!/^[0-9a-f]{32}$/i.test(token)) return null

  const supabase = createAdminClient()
  const { data: pair, error } = await supabase
    .from('pairs')
    .select('status, created_at, tournament_id, player1_id, player2_id')
    .eq('lookup_token', token)
    .maybeSingle()

  if (error || !pair) return null

  const [{ data: tournament }, { data: players }] = await Promise.all([
    supabase
      .from('tournaments')
      .select('id, name, status')
      .eq('id', pair.tournament_id)
      .maybeSingle(),
    supabase
      .from('players')
      .select('id, full_name')
      .in('id', [pair.player1_id, pair.player2_id]),
  ])

  if (!tournament) return null

  const nameOf = (id: string) =>
    players?.find((p) => p.id === id)?.full_name ?? '—'

  return {
    status: pair.status,
    created_at: pair.created_at,
    tournament,
    player1_name: nameOf(pair.player1_id),
    player2_name: nameOf(pair.player2_id),
  }
}
