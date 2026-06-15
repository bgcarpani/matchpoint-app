/**
 * Imagen de historia (Instagram) del campeón — 1080×1920.
 * Pública: lee la vista segura del bracket; sólo hay imagen si ya hay campeón.
 */
import { getPublicTournament } from '@/lib/public/tournament'
import { getPublicBracket } from '@/lib/public/bracket'
import { getBaseUrl } from '@/lib/url'
import { buildStory } from '@/lib/og/story'

export const runtime = 'edge'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tournamentId: string }> }
) {
  const { tournamentId } = await params
  const [tournament, bracket, baseUrl] = await Promise.all([
    getPublicTournament(tournamentId),
    getPublicBracket(tournamentId),
    getBaseUrl(),
  ])

  if (!bracket?.champion) return new Response('Not found', { status: 404 })

  return buildStory({
    eyebrow: 'Campeón',
    title: bracket.champion,
    subtitle: tournament?.name,
    url: `${baseUrl}/t/${tournamentId}/bracket`,
    caption: 'Mirá las llaves',
  })
}
