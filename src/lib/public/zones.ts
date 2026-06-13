/**
 * Lectura pública de zonas y partidos para /t/[id]/zones.
 *
 * Usa el cliente anon (server). La RLS sólo expone zonas/zone_pairs/matches de
 * zonas PUBLICADAS, y los nombres salen por las vistas seguras
 * `public_pair_view` / `public_court_view` (sin PII ni lookup_token).
 */
import { createClient } from '@/lib/supabase/server'
import type { MatchFormat, ScoringMode } from '@/lib/types/database'
import { formatResult } from '@/lib/domain/match'
import type { StandingRow } from '@/lib/domain/zone'

export interface PublicZoneMatch {
  id: string
  round: number
  team1Label: string
  team2Label: string
  courtName: string | null
  /** marcador formateado si el partido terminó; null si no */
  score: string | null
  winner: 'team1' | 'team2' | null
}

export interface PublicZoneView {
  id: string
  name: string
  matchFormat: MatchFormat
  standingsFrozen: boolean
  standings: StandingRow[]
  pairs: { pairId: string; label: string }[]
  matches: PublicZoneMatch[]
}

const pairLabelFrom = (p1: string, p2: string) => `${p1} / ${p2}`

export async function getPublicZones(
  tournamentId: string
): Promise<PublicZoneView[] | null> {
  if (!/^[0-9a-f-]{36}$/i.test(tournamentId)) return null

  const supabase = await createClient()

  // La RLS *_select_public limita a zonas publicadas del torneo.
  const { data: zones } = await supabase
    .from('zones')
    .select('id, name, match_format, standings_frozen')
    .eq('tournament_id', tournamentId)
    .order('name', { ascending: true })

  if (!zones || zones.length === 0) return null

  const zoneIds = zones.map((z) => z.id)

  // scoring_mode sale de tournaments (sin PII; anon lee por tournaments_public_read).
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('scoring_mode')
    .eq('id', tournamentId)
    .maybeSingle()
  const scoringMode: ScoringMode = tournament?.scoring_mode ?? 'games'

  const [
    { data: zonePairs },
    { data: pairView },
    { data: matches },
    { data: courts },
    { data: standings },
  ] = await Promise.all([
    supabase
      .from('zone_pairs')
      .select('zone_id, pair_id, position')
      .in('zone_id', zoneIds),
    supabase
      .from('public_pair_view')
      .select('id, player1_name, player2_name')
      .eq('tournament_id', tournamentId),
    supabase
      .from('matches')
      .select(
        'id, zone_id, round, court_id, team1_pair_id, team2_pair_id, status, team1_score, team2_score, score_detail, winner_pair_id'
      )
      .in('zone_id', zoneIds)
      .order('round', { ascending: true }),
    supabase
      .from('public_court_view')
      .select('id, name')
      .eq('tournament_id', tournamentId),
    supabase
      .from('zone_standings_view')
      .select(
        'zone_id, pair_id, played, won, lost, games_for, games_against, games_diff, points'
      )
      .in('zone_id', zoneIds),
  ])

  const pairLabel = new Map(
    (pairView ?? []).map((p) => [
      p.id,
      pairLabelFrom(p.player1_name, p.player2_name),
    ])
  )
  const courtName = new Map((courts ?? []).map((c) => [c.id, c.name]))
  const standingByPair = new Map(
    (standings ?? []).map((s) => [s.pair_id, s])
  )

  return zones.map((z) => ({
    id: z.id,
    name: z.name,
    matchFormat: z.match_format,
    standingsFrozen: z.standings_frozen,
    standings: (zonePairs ?? [])
      .filter((zp) => zp.zone_id === z.id)
      .map((zp): StandingRow => {
        const s = standingByPair.get(zp.pair_id)
        return {
          pairId: zp.pair_id,
          label: pairLabel.get(zp.pair_id) ?? '—',
          position: zp.position ?? null,
          played: s?.played ?? 0,
          won: s?.won ?? 0,
          lost: s?.lost ?? 0,
          gamesFor: s?.games_for ?? 0,
          gamesAgainst: s?.games_against ?? 0,
          gamesDiff: s?.games_diff ?? 0,
          points: s?.points ?? 0,
        }
      }),
    pairs: (zonePairs ?? [])
      .filter((zp) => zp.zone_id === z.id)
      .map((zp) => ({
        pairId: zp.pair_id,
        label: pairLabel.get(zp.pair_id) ?? '—',
      })),
    matches: (matches ?? [])
      .filter((m) => m.zone_id === z.id)
      .map((m) => ({
        id: m.id,
        round: m.round,
        team1Label: pairLabel.get(m.team1_pair_id ?? '') ?? '—',
        team2Label: pairLabel.get(m.team2_pair_id ?? '') ?? '—',
        courtName: m.court_id ? (courtName.get(m.court_id) ?? null) : null,
        score:
          m.status === 'finished'
            ? formatResult(
                scoringMode,
                m.team1_score,
                m.team2_score,
                m.score_detail
              )
            : null,
        winner: m.winner_pair_id
          ? m.winner_pair_id === m.team1_pair_id
            ? ('team1' as const)
            : ('team2' as const)
          : null,
      })),
  }))
}
