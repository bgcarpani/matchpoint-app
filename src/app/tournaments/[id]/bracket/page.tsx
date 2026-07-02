import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { requireApprovedOrganizer } from '@/lib/supabase/auth'
import { getBaseUrl } from '@/lib/url'
import { categoryLabel, GENDER_LABELS } from '@/lib/domain/tournament'
import { OrganizerHeader } from '@/components/organizer/organizer-header'
import {
  BracketBoard,
  type BracketMatchView,
} from '@/components/bracket/bracket-board'

export const metadata: Metadata = { title: 'Llaves — Matchpoint' }

export default async function BracketPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const { supabase, user } = await requireApprovedOrganizer()

  const [{ data: organizer }, { data: tournament }, baseUrl] = await Promise.all([
    supabase
      .from('organizers')
      .select('establishment_name, theme_key, logo_path')
      .eq('id', user.id)
      .single(),
    supabase
      .from('tournaments')
      .select(
        'id, name, status, scoring_mode, games_per_set, qualifiers_per_zone, bracket_published, category_type, category_value, gender'
      )
      .eq('id', id)
      .single(),
    getBaseUrl(),
  ])
  if (!tournament) notFound()

  const [
    { data: zones },
    { data: bracketMatches },
    { data: acceptedPairs },
    { data: courts },
  ] = await Promise.all([
    supabase.from('zones').select('id, standings_frozen').eq('tournament_id', id),
    supabase
      .from('matches')
      .select(
        'id, bracket_round, bracket_slot, court_id, team1_pair_id, team2_pair_id, status, team1_score, team2_score, score_detail, winner_pair_id'
      )
      .eq('tournament_id', id)
      .eq('phase', 'bracket')
      .order('bracket_round', { ascending: true })
      .order('bracket_slot', { ascending: true }),
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
  ])

  // Etiquetas de pareja (nombres cortos), igual que en la página de zonas.
  const accepted = acceptedPairs ?? []
  const playerIds = accepted.flatMap((p) => [p.player1_id, p.player2_id])
  const { data: players } = playerIds.length
    ? await supabase.from('players').select('id, full_name').in('id', playerIds)
    : { data: [] as { id: string; full_name: string }[] }
  const playerName = new Map((players ?? []).map((p) => [p.id, p.full_name]))
  const pairLabel = new Map(
    accepted.map((p) => [
      p.id,
      `${shortName(playerName.get(p.player1_id))} / ${shortName(playerName.get(p.player2_id))}`,
    ])
  )
  const teamOf = (pairId: string | null) =>
    pairId ? { pairId, label: pairLabel.get(pairId) ?? '—' } : null

  const matches: BracketMatchView[] = (bracketMatches ?? []).map((m) => ({
    id: m.id,
    round: m.bracket_round ?? 0,
    slot: m.bracket_slot ?? 0,
    courtId: m.court_id,
    team1: teamOf(m.team1_pair_id),
    team2: teamOf(m.team2_pair_id),
    status: m.status,
    team1Score: m.team1_score,
    team2Score: m.team2_score,
    scoreDetail: m.score_detail,
    winner: m.winner_pair_id
      ? m.winner_pair_id === m.team1_pair_id
        ? ('team1' as const)
        : ('team2' as const)
      : null,
  }))

  // Participantes actuales del cuadro (para el override de cruces).
  const seen = new Set<string>()
  const participants: { pairId: string; label: string }[] = []
  for (const m of matches) {
    for (const t of [m.team1, m.team2]) {
      if (t && !seen.has(t.pairId)) {
        seen.add(t.pairId)
        participants.push(t)
      }
    }
  }

  const inProgress = tournament.status === 'in_progress'
  const zoneList = zones ?? []
  const allZonesFrozen =
    zoneList.length > 0 && zoneList.every((z) => z.standings_frozen)
  const hasBracket = matches.length > 0
  const published = tournament.bracket_published
  const anyFinished = matches.some((m) => m.status === 'finished')

  const canGenerate = inProgress && allZonesFrozen
  const generateHint = !inProgress
    ? 'Las llaves se arman con el torneo en curso.'
    : !allZonesFrozen
      ? 'Cerrá las posiciones de todas las zonas primero.'
      : null
  const canEditSeeds = hasBracket && !published && !anyFinished

  return (
    <div className="relative z-[2] mx-auto w-full max-w-4xl px-5 py-8 sm:px-8">
      <div className="no-print">
        <OrganizerHeader establishmentName={organizer?.establishment_name} themeKey={organizer?.theme_key} logoPath={organizer?.logo_path} />
      </div>

      <section className="mt-10">
        <Link
          href={`/tournaments/${tournament.id}`}
          className="no-print text-sm text-muted-foreground hover:text-foreground"
        >
          ← Volver al torneo
        </Link>
        <h1 className="font-display mt-4 text-[clamp(2rem,6vw,3.5rem)] text-foreground">
          Llaves
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{tournament.name}</p>

        <div className="mt-8">
          <BracketBoard
            tournamentId={tournament.id}
            matches={matches}
            participants={participants}
            courts={courts ?? []}
            published={published}
            canGenerate={canGenerate}
            generateHint={generateHint}
            canRecordResults={inProgress}
            canEditSeeds={canEditSeeds}
            scoringMode={tournament.scoring_mode}
            gamesPerSet={tournament.games_per_set}
            tournamentName={tournament.name}
            shareUrl={`${baseUrl}/t/${tournament.id}`}
            storyUrl={`${baseUrl}/t/${tournament.id}/bracket/og/story`}
            categoryGender={`${categoryLabel(
              tournament.category_type,
              tournament.category_value
            )} ${GENDER_LABELS[tournament.gender]}`}
          />
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
