/**
 * Lectura pública de zonas y partidos para /t/[id]/zones.
 *
 * Usa el cliente anon (server). La RLS sólo expone zonas/zone_pairs/matches de
 * zonas PUBLICADAS, y los nombres salen por las vistas seguras
 * `public_pair_view` / `public_court_view` (sin PII ni lookup_token).
 */
import { createClient } from '@/lib/supabase/server'

export interface PublicZoneMatch {
  id: string
  round: number
  team1Label: string
  team2Label: string
  courtName: string | null
}

export interface PublicZoneView {
  id: string
  name: string
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
    .select('id, name')
    .eq('tournament_id', tournamentId)
    .order('name', { ascending: true })

  if (!zones || zones.length === 0) return null

  const zoneIds = zones.map((z) => z.id)

  const [{ data: zonePairs }, { data: pairView }, { data: matches }, { data: courts }] =
    await Promise.all([
      supabase.from('zone_pairs').select('zone_id, pair_id').in('zone_id', zoneIds),
      supabase
        .from('public_pair_view')
        .select('id, player1_name, player2_name')
        .eq('tournament_id', tournamentId),
      supabase
        .from('matches')
        .select('id, zone_id, round, court_id, team1_pair_id, team2_pair_id')
        .in('zone_id', zoneIds)
        .order('round', { ascending: true }),
      supabase
        .from('public_court_view')
        .select('id, name')
        .eq('tournament_id', tournamentId),
    ])

  const pairLabel = new Map(
    (pairView ?? []).map((p) => [
      p.id,
      pairLabelFrom(p.player1_name, p.player2_name),
    ])
  )
  const courtName = new Map((courts ?? []).map((c) => [c.id, c.name]))

  return zones.map((z) => ({
    id: z.id,
    name: z.name,
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
        team1Label: pairLabel.get(m.team1_pair_id) ?? '—',
        team2Label: pairLabel.get(m.team2_pair_id) ?? '—',
        courtName: m.court_id ? (courtName.get(m.court_id) ?? null) : null,
      })),
  }))
}
