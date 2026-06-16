import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { OrganizerHeader } from '@/components/organizer/organizer-header'
import { canManageZones } from '@/lib/domain/tournament'
import {
  ZoneManager,
  type ZoneView,
} from '@/components/zones/zone-manager'

export const metadata: Metadata = { title: 'Zonas y partidos — Matchpoint' }

export default async function ZonesPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: organizer }, { data: tournament }] = await Promise.all([
    supabase
      .from('organizers')
      .select('establishment_name')
      .eq('id', user.id)
      .single(),
    supabase
      .from('tournaments')
      .select('id, name, status, scoring_mode, games_per_set')
      .eq('id', id)
      .single(),
  ])
  if (!tournament) notFound()

  // Parejas aceptadas (las que entran al sorteo de zonas) + canchas + zonas.
  const [{ data: acceptedPairs }, { data: courts }, { data: zones }] =
    await Promise.all([
      supabase
        .from('pairs')
        .select('id, player1_id, player2_id')
        .eq('tournament_id', id)
        .eq('status', 'accepted'),
      supabase
        .from('courts')
        .select('id, name, type')
        .eq('organizer_id', user.id)
        .order('name', { ascending: true }),
      supabase
        .from('zones')
        .select('id, name, is_published, match_format, standings_frozen')
        .eq('tournament_id', id)
        .order('name', { ascending: true }),
    ])

  const zoneList = zones ?? []
  const zoneIds = zoneList.map((z) => z.id)

  const [{ data: zonePairs }, { data: matches }, { data: standings }] =
    await Promise.all([
    zoneIds.length
      ? supabase
          .from('zone_pairs')
          .select('zone_id, pair_id, position')
          .in('zone_id', zoneIds)
      : Promise.resolve({
          data: [] as {
            zone_id: string
            pair_id: string
            position: number | null
          }[],
        }),
    zoneIds.length
      ? supabase
          .from('matches')
          .select(
            'id, zone_id, round, court_id, team1_pair_id, team2_pair_id, status, team1_score, team2_score, score_detail, winner_pair_id'
          )
          .in('zone_id', zoneIds)
          .order('round', { ascending: true })
      : Promise.resolve({
          data: [] as {
            id: string
            zone_id: string | null
            round: number
            court_id: string | null
            team1_pair_id: string | null
            team2_pair_id: string | null
            status: import('@/lib/types/database').MatchStatus
            team1_score: number | null
            team2_score: number | null
            score_detail: number[][] | null
            winner_pair_id: string | null
          }[],
        }),
    zoneIds.length
      ? supabase
          .from('zone_standings_view')
          .select(
            'zone_id, pair_id, played, won, lost, games_for, games_against, games_diff, points'
          )
          .in('zone_id', zoneIds)
      : Promise.resolve({
          data: [] as {
            zone_id: string
            pair_id: string
            played: number
            won: number
            lost: number
            games_for: number
            games_against: number
            games_diff: number
            points: number
          }[],
        }),
  ])

  // Nombres de jugadores de todas las parejas aceptadas → etiqueta por pareja.
  const accepted = acceptedPairs ?? []
  const playerIds = accepted.flatMap((p) => [p.player1_id, p.player2_id])
  const { data: players } = playerIds.length
    ? await supabase
        .from('players')
        .select('id, full_name')
        .in('id', playerIds)
    : { data: [] as { id: string; full_name: string }[] }

  const playerName = new Map((players ?? []).map((p) => [p.id, p.full_name]))
  const pairLabel = new Map(
    accepted.map((p) => [
      p.id,
      `${shortName(playerName.get(p.player1_id))} / ${shortName(
        playerName.get(p.player2_id)
      )}`,
    ])
  )

  // Posición congelada por pareja (de zone_pairs) + métricas en vivo (de la vista).
  const pairPosition = new Map(
    (zonePairs ?? []).map((zp) => [zp.pair_id, zp.position])
  )
  const standingByPair = new Map(
    (standings ?? []).map((s) => [s.pair_id, s])
  )

  // Ensambla la vista por zona.
  const zoneViews: ZoneView[] = zoneList.map((z) => ({
    id: z.id,
    name: z.name,
    isPublished: z.is_published,
    matchFormat: z.match_format,
    standingsFrozen: z.standings_frozen,
    standings: (zonePairs ?? [])
      .filter((zp) => zp.zone_id === z.id)
      .map((zp) => {
        const s = standingByPair.get(zp.pair_id)
        return {
          pairId: zp.pair_id,
          label: pairLabel.get(zp.pair_id) ?? '—',
          position: pairPosition.get(zp.pair_id) ?? null,
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
        courtId: m.court_id,
        team1Label: pairLabel.get(m.team1_pair_id ?? '') ?? '—',
        team2Label: pairLabel.get(m.team2_pair_id ?? '') ?? '—',
        status: m.status,
        team1Score: m.team1_score,
        team2Score: m.team2_score,
        scoreDetail: m.score_detail,
        winner: m.winner_pair_id
          ? m.winner_pair_id === m.team1_pair_id
            ? ('team1' as const)
            : ('team2' as const)
          : null,
      })),
  }))

  const anyPublished = zoneList.some((z) => z.is_published)
  const ready = canManageZones(tournament.status)
  const canRecordResults = tournament.status === 'in_progress'

  return (
    <div className="relative z-[2] mx-auto w-full max-w-4xl px-5 py-8 sm:px-8">
      <div className="no-print">
        <OrganizerHeader establishmentName={organizer?.establishment_name} />
      </div>

      <section className="mt-10">
        <Link
          href={`/tournaments/${tournament.id}`}
          className="no-print text-sm text-muted-foreground hover:text-foreground"
        >
          ← Volver al torneo
        </Link>
        <h1 className="font-display mt-4 text-[clamp(2rem,6vw,3.5rem)] text-foreground">
          Zonas y partidos
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{tournament.name}</p>

        <div className="mt-8">
          {!ready && zoneViews.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/20 p-10 text-center">
              <p className="text-foreground">
                Las zonas se habilitan al cerrar la inscripción.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Cuando el torneo pase a “Inscripción cerrada” vas a poder
                sortear las zonas y generar los partidos.
              </p>
            </div>
          ) : (
            <ZoneManager
              tournamentId={tournament.id}
              zones={zoneViews}
              courts={courts ?? []}
              acceptedCount={accepted.length}
              canManage={ready && !anyPublished}
              published={anyPublished}
              canRecordResults={canRecordResults}
              scoringMode={tournament.scoring_mode}
              gamesPerSet={tournament.games_per_set}
            />
          )}
        </div>
      </section>
    </div>
  )
}

/** "Juan Pérez" → "Juan P." para etiquetas compactas de pareja. */
function shortName(full: string | undefined): string {
  if (!full) return '—'
  const [first, ...rest] = full.trim().split(/\s+/)
  if (rest.length === 0) return first
  return `${first} ${rest[rest.length - 1][0]}.`
}
