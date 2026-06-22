/**
 * Imagen de historia (Instagram) de la PAREJA CAMPEONA — 1080×1920.
 * Pública: lee la vista segura del bracket; sólo hay imagen si ya hay campeón.
 *
 * `?style=a|b|c` elige el diseño (el organizer lo selecciona al compartir):
 *   a = Marquesina (noche), b = Sello (azul, centrado), c = Editorial (claro).
 */
import { getPublicTournament } from '@/lib/public/tournament'
import { getPublicBracket } from '@/lib/public/bracket'
import {
  buildChampionStory,
  type ChampionStyle,
} from '@/lib/og/champion-story'
import { categoryLabel, GENDER_LABELS } from '@/lib/domain/tournament'

const STYLES: ChampionStyle[] = ['a', 'b', 'c']

export async function GET(
  req: Request,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  const { tournamentId } = await params
  const [tournament, bracket] = await Promise.all([
    getPublicTournament(tournamentId),
    getPublicBracket(tournamentId),
  ])

  if (!bracket?.champion) return new Response('Not found', { status: 404 })

  const styleParam = new URL(req.url).searchParams.get('style')
  const style: ChampionStyle = STYLES.includes(styleParam as ChampionStyle)
    ? (styleParam as ChampionStyle)
    : 'a'

  // El campeón viene como "Jugador 1 / Jugador 2" (nombres completos).
  const [name1, name2 = ''] = bracket.champion.split(' / ')

  const category = tournament
    ? `${categoryLabel(tournament.category_type, tournament.category_value)} · ${GENDER_LABELS[tournament.gender]}`
    : ''

  return buildChampionStory({
    style,
    name1,
    name2,
    tournamentName: tournament?.name ?? '',
    category,
    caption: 'Mirá las llaves',
  })
}
