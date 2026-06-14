'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/supabase/auth'
import { zoneErrorLabel } from '@/lib/domain/zone'
import { computeResult, type RecordResultInput } from '@/lib/domain/match'
import type { MatchFormat } from '@/lib/types/database'

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
 * (Re)genera los partidos de UNA zona con el formato elegido (round_robin /
 * winner_vs_loser / manual). Reemplaza los partidos existentes de la zona y
 * reinicia sus posiciones. Sólo antes de publicar.
 */
export async function regenerateZoneMatches(
  tournamentId: string,
  zoneId: string,
  format: MatchFormat
): Promise<ActionResult> {
  const { supabase } = await requireUser()
  const { error } = await supabase.rpc('generate_zone_matches', {
    p_zone_id: zoneId,
    p_format: format,
  })
  if (error) return { error: zoneErrorLabel(error.message) }

  revalidate(tournamentId)
  return { ok: true }
}

/**
 * Aplica un formato de partido a TODAS las zonas del torneo (el formato es
 * global, no por zona). Recorre las zonas y regenera sus partidos vía
 * generate_zone_matches (que valida no-publicado y reinicia posiciones). Si una
 * zona no soporta el formato (p. ej. winner_vs_loser sin 4 parejas), la RPC
 * devuelve error y se corta.
 */
export async function setZonesFormat(
  tournamentId: string,
  format: MatchFormat
): Promise<ActionResult> {
  const { supabase } = await requireUser()
  const { data: zones } = await supabase
    .from('zones')
    .select('id')
    .eq('tournament_id', tournamentId)
  if (!zones || zones.length === 0)
    return { error: 'No hay zonas para aplicar el formato.' }

  for (const z of zones) {
    const { error } = await supabase.rpc('generate_zone_matches', {
      p_zone_id: z.id,
      p_format: format,
    })
    if (error) return { error: zoneErrorLabel(error.message) }
  }

  revalidate(tournamentId)
  return { ok: true }
}

/**
 * Genera la ronda 2 de una zona winner_vs_loser a partir de los resultados de la
 * ronda 1 (ganador-vs-ganador y perdedor-vs-perdedor). Requiere el torneo en
 * curso con los dos partidos de ronda 1 cargados.
 */
export async function generateNextRound(
  tournamentId: string,
  zoneId: string
): Promise<ActionResult> {
  const { supabase } = await requireUser()
  const { error } = await supabase.rpc('generate_next_zone_round', {
    p_zone_id: zoneId,
  })
  if (error) return { error: zoneErrorLabel(error.message) }

  revalidate(tournamentId)
  return { ok: true }
}

/**
 * Agrega un partido a una zona MANUAL (antes de publicar). Valida que la zona
 * sea manual y no publicada, y que ambas parejas pertenezcan a la zona (la RLS
 * matches_all_owner protege la fila; este chequeo evita partidos inconsistentes).
 */
export async function addManualMatch(
  tournamentId: string,
  zoneId: string,
  team1PairId: string,
  team2PairId: string
): Promise<ActionResult> {
  if (team1PairId === team2PairId)
    return { error: 'Una pareja no puede jugar contra sí misma.' }

  const { supabase } = await requireUser()

  const { data: zone } = await supabase
    .from('zones')
    .select('tournament_id, match_format, is_published')
    .eq('id', zoneId)
    .single()
  if (!zone || zone.tournament_id !== tournamentId)
    return { error: 'No se encontró la zona.' }
  if (zone.is_published)
    return { error: 'Las zonas publicadas no se pueden modificar.' }
  if (zone.match_format !== 'manual')
    return { error: 'Sólo se agregan partidos en zonas de formato manual.' }

  const { data: zonePairs } = await supabase
    .from('zone_pairs')
    .select('pair_id')
    .eq('zone_id', zoneId)
    .in('pair_id', [team1PairId, team2PairId])
  if (!zonePairs || zonePairs.length !== 2)
    return { error: 'Ambas parejas tienen que ser de esta zona.' }

  const { data: last } = await supabase
    .from('matches')
    .select('round')
    .eq('zone_id', zoneId)
    .order('round', { ascending: false })
    .limit(1)
    .maybeSingle()
  const nextRound = (last?.round ?? 0) + 1

  const { error } = await supabase.from('matches').insert({
    zone_id: zoneId,
    round: nextRound,
    team1_pair_id: team1PairId,
    team2_pair_id: team2PairId,
  })
  if (error) return { error: 'No se pudo agregar el partido.' }

  revalidate(tournamentId)
  return { ok: true }
}

/**
 * Borra un partido de una zona MANUAL (antes de publicar). Valida que la zona
 * sea manual y no publicada antes de borrar.
 */
export async function removeManualMatch(
  tournamentId: string,
  matchId: string
): Promise<ActionResult> {
  const { supabase } = await requireUser()

  const { data: match } = await supabase
    .from('matches')
    .select('zone_id')
    .eq('id', matchId)
    .single()
  if (!match || !match.zone_id) return { error: 'No se encontró el partido.' }

  const { data: zone } = await supabase
    .from('zones')
    .select('tournament_id, match_format, is_published')
    .eq('id', match.zone_id)
    .single()
  if (!zone || zone.tournament_id !== tournamentId)
    return { error: 'No se encontró la zona.' }
  if (zone.is_published)
    return { error: 'Las zonas publicadas no se pueden modificar.' }
  if (zone.match_format !== 'manual')
    return { error: 'Sólo se borran partidos en zonas de formato manual.' }

  const { error } = await supabase.from('matches').delete().eq('id', matchId)
  if (error) return { error: 'No se pudo borrar el partido.' }

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
 * Carga (o corrige) el resultado de un partido de zona. Sólo el organizador
 * dueño y sólo con el torneo `in_progress`. Valida las reglas de scoring según
 * la config del torneo (modo + games_per_set) y persiste games/sets, el
 * desglose por set y la pareja ganadora; el partido pasa a `finished`. La RLS
 * (matches_all_owner) protege la fila; el recálculo de standings es derivado
 * (vista en vivo, Feature 4). Corregir = volver a llamar (sobrescribe).
 */
export async function recordMatchResult(
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
    .select('id, zone_id, team1_pair_id, team2_pair_id')
    .eq('id', matchId)
    .single()
  if (!match || !match.zone_id)
    return { error: 'No se encontró el partido.' }

  // Defensa: el partido tiene que ser de una zona de ESTE torneo (la RLS ya
  // restringe al dueño, pero evitamos cruzar torneos del mismo organizador).
  const { data: zone } = await supabase
    .from('zones')
    .select('tournament_id')
    .eq('id', match.zone_id)
    .single()
  if (!zone || zone.tournament_id !== tournamentId)
    return { error: 'El partido no pertenece a este torneo.' }

  const result = computeResult(t.scoring_mode, t.games_per_set, input)
  if ('error' in result) return { error: result.error }

  const winnerPairId =
    result.winner === 'team1' ? match.team1_pair_id : match.team2_pair_id

  const { error } = await supabase
    .from('matches')
    .update({
      team1_score: result.team1_score,
      team2_score: result.team2_score,
      score_detail: result.score_detail,
      winner_pair_id: winnerPairId,
      status: 'finished',
    })
    .eq('id', matchId)
  if (error) return { error: 'No se pudo guardar el resultado.' }

  revalidate(tournamentId)
  return { ok: true }
}

/** Borra el resultado de un partido (vuelve a `pending`). Sólo in_progress. */
export async function clearMatchResult(
  tournamentId: string,
  matchId: string
): Promise<ActionResult> {
  const { supabase } = await requireUser()

  const { data: t } = await supabase
    .from('tournaments')
    .select('status')
    .eq('id', tournamentId)
    .single()
  if (!t) return { error: 'Torneo no encontrado.' }
  if (t.status !== 'in_progress')
    return { error: 'Sólo se corrige con el torneo en curso.' }

  const { error } = await supabase
    .from('matches')
    .update({
      team1_score: null,
      team2_score: null,
      score_detail: null,
      winner_pair_id: null,
      status: 'pending',
    })
    .eq('id', matchId)
  if (error) return { error: 'No se pudo borrar el resultado.' }

  revalidate(tournamentId)
  return { ok: true }
}

/**
 * Cierra (congela) las posiciones de una zona: recalcula puntos y posiciones
 * desde los resultados y las fija en `zone_pairs`. Exige todos los partidos de
 * la zona en `finished`. Habilita (a futuro) el sorteo de bracket.
 */
export async function freezeZoneStandings(
  tournamentId: string,
  zoneId: string
): Promise<ActionResult> {
  const { supabase } = await requireUser()
  const { error } = await supabase.rpc('freeze_zone_standings', {
    p_zone_id: zoneId,
  })
  if (error) return { error: zoneErrorLabel(error.message) }

  revalidate(tournamentId)
  return { ok: true }
}

/**
 * Cierra las posiciones de una zona MANUAL con el orden fijado por el organizador.
 * `pairIds` es el orden final (índice 0 = 1º puesto). Exige todos los partidos
 * de la zona en `finished` y que el orden cubra todas las parejas sin repetir.
 */
export async function freezeManualStandings(
  tournamentId: string,
  zoneId: string,
  pairIds: string[]
): Promise<ActionResult> {
  const { supabase } = await requireUser()
  const { error } = await supabase.rpc('freeze_manual_standings', {
    p_zone_id: zoneId,
    p_pair_ids: pairIds,
  })
  if (error) return { error: zoneErrorLabel(error.message) }

  revalidate(tournamentId)
  return { ok: true }
}

/** Reabre las posiciones de una zona para corregir resultados. */
export async function reopenZoneStandings(
  tournamentId: string,
  zoneId: string
): Promise<ActionResult> {
  const { supabase } = await requireUser()
  const { error } = await supabase.rpc('reopen_zone_standings', {
    p_zone_id: zoneId,
  })
  if (error) return { error: zoneErrorLabel(error.message) }

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
