/**
 * Imagen de historia (Instagram) del torneo — 1080×1920.
 * Pública: lee la vista segura del torneo y muestra el link de inscripción como CTA.
 *
 * `?style=a|b|c` elige el diseño (el organizer lo selecciona al compartir):
 *   a = Afiche (noche), b = Marcador (tablero), c = Ficha (claro).
 * El acento sale de la paleta de marca del organizador (`themeAccent`).
 */
import { getPublicTournament } from '@/lib/public/tournament'
import { getBaseUrl } from '@/lib/url'
import { loadLogoDataUrl } from '@/lib/og/story'
import {
  buildTournamentStory,
  type TournamentStyle,
} from '@/lib/og/tournament-story'
import { themeAccent } from '@/lib/branding/themes'
import { logoPublicUrl } from '@/lib/branding/logo'
import { GENDER_LABELS, FORMAT_LABEL } from '@/lib/domain/tournament'
import { formatStoryDate } from '@/lib/format'

const STYLES: TournamentStyle[] = ['a', 'b', 'c']

export async function GET(
  req: Request,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  const { tournamentId } = await params
  const tournament = await getPublicTournament(tournamentId)
  if (!tournament) return new Response('Not found', { status: 404 })

  const styleParam = new URL(req.url).searchParams.get('style')
  const style: TournamentStyle = STYLES.includes(styleParam as TournamentStyle)
    ? (styleParam as TournamentStyle)
    : 'a'

  const [baseUrl, logoDataUrl] = await Promise.all([
    getBaseUrl(),
    loadLogoDataUrl(logoPublicUrl(tournament.logo_path)),
  ])

  return buildTournamentStory({
    style,
    establishmentName: tournament.establishment_name,
    categoryType: tournament.category_type,
    categoryValue: tournament.category_value,
    gender: GENDER_LABELS[tournament.gender],
    dateLabel: formatStoryDate(tournament.tournament_date),
    formatLabel: FORMAT_LABEL,
    acceptedPairs: tournament.accepted_pairs,
    maxPairs: tournament.max_pairs,
    url: `${baseUrl}/t/${tournamentId}`,
    accent: themeAccent(tournament.theme_key),
    logoDataUrl,
  })
}
