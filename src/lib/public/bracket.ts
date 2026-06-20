/**
 * Lectura pública del bracket para /t/[id]/bracket.
 *
 * Usa el cliente anon (server). `public_bracket_view` (vista definer) sólo
 * expone partidos de bracket de torneos con bracket_published = true y columnas
 * seguras; los nombres salen por `public_pair_view` (sin PII).
 */
import { createClient } from '@/lib/supabase/server'
import type { ScoringMode } from '@/lib/types/database'
import { bracketRoundLabel } from '@/lib/domain/bracket'

export interface PublicBracketMatch {
  id: string
  slot: number
  team1Label: string | null
  team2Label: string | null
  courtName: string | null
  /** true si el partido ya se jugó (tiene resultado cargado) */
  played: boolean
  /** marcador estructurado (mismo formato que el lado organizer) */
  team1Score: number | null
  team2Score: number | null
  scoreDetail: number[][] | null
  winner: 'team1' | 'team2' | null
}

export interface PublicBracketRound {
  round: number
  label: string
  matches: PublicBracketMatch[]
}

export interface PublicBracketView {
  rounds: PublicBracketRound[]
  scoringMode: ScoringMode
  champion: string | null
}

const pairLabelFrom = (p1: string, p2: string) => `${p1} / ${p2}`

export async function getPublicBracket(
  tournamentId: string
): Promise<PublicBracketView | null> {
  if (!/^[0-9a-f-]{36}$/i.test(tournamentId)) return null

  const supabase = await createClient()

  const { data: matches } = await supabase
    .from('public_bracket_view')
    .select(
      'id, bracket_round, bracket_slot, court_id, team1_pair_id, team2_pair_id, team1_score, team2_score, score_detail, winner_pair_id, status'
    )
    .eq('tournament_id', tournamentId)
    .order('bracket_round', { ascending: true })
    .order('bracket_slot', { ascending: true })

  if (!matches || matches.length === 0) return null

  const [{ data: tournament }, { data: pairView }, { data: courts }] =
    await Promise.all([
      supabase
        .from('tournaments')
        .select('scoring_mode')
        .eq('id', tournamentId)
        .maybeSingle(),
      supabase
        .from('public_pair_view')
        .select('id, player1_name, player2_name')
        .eq('tournament_id', tournamentId),
      supabase
        .from('public_court_view')
        .select('id, name')
        .eq('tournament_id', tournamentId),
    ])
  const scoringMode: ScoringMode = tournament?.scoring_mode ?? 'games'
  const pairLabel = new Map(
    (pairView ?? []).map((p) => [
      p.id,
      pairLabelFrom(p.player1_name, p.player2_name),
    ])
  )
  const courtName = new Map((courts ?? []).map((c) => [c.id, c.name]))

  const totalRounds = matches.reduce(
    (m, x) => Math.max(m, x.bracket_round ?? 0),
    0
  )

  const byRound = new Map<number, PublicBracketMatch[]>()
  for (const m of matches) {
    const round = m.bracket_round ?? 0
    const arr = byRound.get(round) ?? []
    arr.push({
      id: m.id,
      slot: m.bracket_slot ?? 0,
      team1Label: m.team1_pair_id
        ? (pairLabel.get(m.team1_pair_id) ?? '—')
        : null,
      team2Label: m.team2_pair_id
        ? (pairLabel.get(m.team2_pair_id) ?? '—')
        : null,
      courtName: m.court_id ? (courtName.get(m.court_id) ?? null) : null,
      played: m.status === 'finished',
      team1Score: m.team1_score,
      team2Score: m.team2_score,
      scoreDetail: m.score_detail,
      winner: m.winner_pair_id
        ? m.winner_pair_id === m.team1_pair_id
          ? ('team1' as const)
          : ('team2' as const)
        : null,
    })
    byRound.set(round, arr)
  }

  const rounds: PublicBracketRound[] = [...byRound.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([round, ms]) => ({
      round,
      label: bracketRoundLabel(round, totalRounds),
      matches: ms.sort((a, b) => a.slot - b.slot),
    }))

  // Campeón: ganador de la final (último round) si terminó.
  const final = matches.find((m) => (m.bracket_round ?? 0) === totalRounds)
  let champion: string | null = null
  if (final && final.status === 'finished' && final.winner_pair_id) {
    champion = pairLabel.get(final.winner_pair_id) ?? null
  }

  return { rounds, scoringMode, champion }
}
