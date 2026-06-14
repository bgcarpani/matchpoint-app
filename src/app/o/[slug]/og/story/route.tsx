/**
 * Imagen de historia (Instagram) del calendario del organizador — 1080×1920.
 * Pública: resuelve el organizer por slug y cuenta sus torneos vigentes.
 */
import {
  getPublicOrganizerBySlug,
  getActiveTournaments,
} from '@/lib/public/calendar'
import { getBaseUrl } from '@/lib/url'
import { buildStory } from '@/lib/og/story'

export const runtime = 'edge'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const organizer = await getPublicOrganizerBySlug(slug)
  if (!organizer) return new Response('Not found', { status: 404 })

  const [tournaments, baseUrl] = await Promise.all([
    getActiveTournaments(organizer.id),
    getBaseUrl(),
  ])

  const count = tournaments.length
  const subtitle =
    count > 0
      ? `${count} ${count === 1 ? 'torneo vigente' : 'torneos vigentes'}`
      : 'Próximamente, nuevos torneos'

  return await buildStory({
    eyebrow: 'Calendario',
    title: organizer.establishment_name,
    subtitle,
    qrValue: `${baseUrl}/o/${slug}`,
    caption: 'Escaneá para ver los torneos',
  })
}
