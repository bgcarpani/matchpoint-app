'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/supabase/auth'
import { bracketError } from '@/lib/domain/bracket'
import { computeResult, type RecordResultInput } from '@/lib/domain/match'

export type ActionResult = { error: string } | { ok: true }

function revalidate(tournamentId: string) {
  revalidatePath(`/tournaments/${tournamentId}/bracket`)
  revalidatePath(`/tournaments/${tournamentId}`)
  revalidatePath(`/t/${tournamentId}/bracket`)
  revalidatePath(`/t/${tournamentId}`)
}

/**
 * Genera (o regenera) el bracket a partir de los clasificados de zona. Requiere
 * el torneo en curso, todas las zonas con posiciones cerradas y las llaves no
 * publicadas (la RPC valida todo). Siembra estándar + byes a los mejores.
 */
export async function generateBracket(tournamentId: string): Promise<ActionResult> {
  const { supabase } = await requireUser()
  const { error } = await supabase.rpc('generate_bracket', {
    p_tournament_id: tournamentId,
  })
  if (error) return { error: bracketError(error.message) }

  revalidate(tournamentId)
  return { ok: true }
}

/**
 * Genera un bracket EN BLANCO (sin parejas) del tamaño elegido, para imprimir
 * llaves vacías y completarlas a mano. Se permite si las llaves no están
 * publicadas y no hay resultados cargados; si ya había un cuadro en blanco se
 * reemplaza (permite cambiar el tamaño). El sorteo real desde las posiciones lo
 * reemplaza luego con `generateBracket`.
 */
export async function generateEmptyBracket(
  tournamentId: string,
  size: number
): Promise<ActionResult> {
  const { supabase } = await requireUser()

  if (![2, 4, 8, 16, 32].includes(size))
    return { error: 'Tamaño de llave inválido.' }

  const { data: t } = await supabase
    .from('tournaments')
    .select('bracket_published')
    .eq('id', tournamentId)
    .single()
  if (!t) return { error: 'Torneo no encontrado.' }
  if (t.bracket_published)
    return { error: 'Las llaves ya están publicadas; no se pueden regenerar.' }

  const { data: existing } = await supabase
    .from('matches')
    .select('id, status')
    .eq('tournament_id', tournamentId)
    .eq('phase', 'bracket')
  if (existing && existing.length > 0) {
    if (existing.some((m) => m.status === 'finished'))
      return { error: 'Ya hay resultados cargados en las llaves.' }
    await supabase
      .from('matches')
      .delete()
      .eq('tournament_id', tournamentId)
      .eq('phase', 'bracket')
  }

  // Árbol completo: rondas 1..log2(size); ronda r con size/2^r partidos.
  const rounds = Math.log2(size)
  const rows = []
  for (let r = 1; r <= rounds; r++) {
    for (let s = 1; s <= size / 2 ** r; s++) {
      rows.push({
        tournament_id: tournamentId,
        phase: 'bracket' as const,
        round: r,
        bracket_round: r,
        bracket_slot: s,
      })
    }
  }
  const { data: inserted, error } = await supabase
    .from('matches')
    .insert(rows)
    .select('id, bracket_round, bracket_slot')
  if (error || !inserted)
    return { error: 'No se pudieron generar las llaves en blanco.' }

  // Enlaza el avance (next_match_id / next_slot): slot impar → team1, par → team2.
  const byKey = new Map(
    inserted.map((m) => [`${m.bracket_round}:${m.bracket_slot}`, m])
  )
  for (const m of inserted) {
    if ((m.bracket_round ?? 0) >= rounds) continue
    const next = byKey.get(
      `${(m.bracket_round ?? 0) + 1}:${Math.ceil((m.bracket_slot ?? 0) / 2)}`
    )
    if (!next) continue
    await supabase
      .from('matches')
      .update({
        next_match_id: next.id,
        next_slot: (m.bracket_slot ?? 0) % 2 === 1 ? 'team1' : 'team2',
      })
      .eq('id', m.id)
  }

  revalidate(tournamentId)
  return { ok: true }
}

/**
 * Carga (o corrige) el resultado de un partido de bracket y avanza al ganador
 * al siguiente cruce. La validación de scoring es en TS (computeResult); la RPC
 * persiste atómicamente y propaga (limpiando aguas abajo si cambia el ganador).
 */
export async function recordBracketResult(
  tournamentId: string,
  matchId: string,
  input: RecordResultInput
): Promise<ActionResult> {
  const { supabase } = await requireUser()

  const { data: t } = await supabase
    .from('tournaments')
    .select('status, scoring_mode, games_per_set')
    .eq('id', tournamentId)
    .single()
  if (!t) return { error: 'Torneo no encontrado.' }
  if (t.status !== 'in_progress')
    return { error: 'Los resultados se cargan con el torneo en curso.' }

  const { data: match } = await supabase
    .from('matches')
    .select('id, tournament_id, phase, team1_pair_id, team2_pair_id')
    .eq('id', matchId)
    .single()
  if (!match || match.tournament_id !== tournamentId || match.phase !== 'bracket')
    return { error: 'No se encontró el partido.' }
  if (!match.team1_pair_id || !match.team2_pair_id)
    return { error: 'El partido todavía no tiene definidas las dos parejas.' }

  const result = computeResult(t.scoring_mode, t.games_per_set, input)
  if ('error' in result) return { error: result.error }

  const winnerPairId =
    result.winner === 'team1' ? match.team1_pair_id : match.team2_pair_id

  const { error } = await supabase.rpc('record_bracket_result', {
    p_match_id: matchId,
    p_team1_score: result.team1_score,
    p_team2_score: result.team2_score,
    p_score_detail: result.score_detail,
    p_winner_pair_id: winnerPairId,
  })
  if (error) return { error: bracketError(error.message) }

  revalidate(tournamentId)
  return { ok: true }
}

/** Borra el resultado de un partido de bracket y limpia el avance aguas abajo. */
export async function clearBracketResult(
  tournamentId: string,
  matchId: string
): Promise<ActionResult> {
  const { supabase } = await requireUser()
  const { error } = await supabase.rpc('clear_bracket_result', {
    p_match_id: matchId,
  })
  if (error) return { error: bracketError(error.message) }

  revalidate(tournamentId)
  return { ok: true }
}

/**
 * Intercambia la posición de dos parejas en el bracket (override manual de
 * cruces). Sólo antes de publicar y sin resultados cargados (la RPC valida).
 */
export async function swapBracketParticipants(
  tournamentId: string,
  pairA: string,
  pairB: string
): Promise<ActionResult> {
  if (pairA === pairB) return { error: 'Elegí dos parejas distintas.' }
  const { supabase } = await requireUser()
  const { error } = await supabase.rpc('swap_bracket_participants', {
    p_pair_a: pairA,
    p_pair_b: pairB,
  })
  if (error) return { error: bracketError(error.message) }

  revalidate(tournamentId)
  return { ok: true }
}

/**
 * Asigna (o quita) la cancha de un partido de bracket. Valida que la cancha sea
 * del organizador y que el partido sea de bracket de este torneo. Editable en
 * cualquier momento (la UI bloquea el cambio cuando hay resultado, salvo Editar).
 */
export async function assignBracketCourt(
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

  const { data: match } = await supabase
    .from('matches')
    .select('id, tournament_id, phase')
    .eq('id', matchId)
    .single()
  if (!match || match.tournament_id !== tournamentId || match.phase !== 'bracket')
    return { error: 'No se encontró el partido.' }

  const { error } = await supabase
    .from('matches')
    .update({ court_id: courtId })
    .eq('id', matchId)
  if (error) return { error: 'No se pudo asignar la cancha.' }

  revalidate(tournamentId)
  return { ok: true }
}

/** Publica las llaves: las hace visibles públicamente. */
export async function publishBracket(
  tournamentId: string
): Promise<ActionResult> {
  const { supabase } = await requireUser()

  const { count } = await supabase
    .from('matches')
    .select('id', { count: 'exact', head: true })
    .eq('tournament_id', tournamentId)
    .eq('phase', 'bracket')
  if (!count) return { error: 'Generá las llaves antes de publicarlas.' }

  const { error } = await supabase
    .from('tournaments')
    .update({ bracket_published: true })
    .eq('id', tournamentId)
  if (error) return { error: 'No se pudieron publicar las llaves.' }

  revalidate(tournamentId)
  return { ok: true }
}
