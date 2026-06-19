/**
 * Imagen de historia (Instagram) del torneo — 1080×1920.
 * Pública: lee la vista segura del torneo y muestra el link de inscripción como CTA.
 */
import { getPublicTournament } from '@/lib/public/tournament'
import { getBaseUrl } from '@/lib/url'
import { buildStory } from '@/lib/og/story'
import { categoryLabel, GENDER_LABELS } from '@/lib/domain/tournament'
import { formatDate } from '@/lib/format'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  const { tournamentId } = await params
  const tournament = await getPublicTournament(tournamentId)
  if (!tournament) return new Response('Not found', { status: 404 })

  const baseUrl = await getBaseUrl()
  const subtitle = [
    tournament.establishment_name,
    `${categoryLabel(tournament.category_type, tournament.category_value)} · ${GENDER_LABELS[tournament.gender]}`,
    formatDate(tournament.tournament_date),
  ]
    .filter(Boolean)
    .join('\n')

  return buildStory({
    eyebrow: 'Torneo',
    title: tournament.name,
    subtitle,
    url: `${baseUrl}/t/${tournamentId}`,
    caption: 'Inscribite online',
  })
}
