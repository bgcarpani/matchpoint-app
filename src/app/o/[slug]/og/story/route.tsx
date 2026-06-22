/**
 * Imagen de historia (Instagram) del calendario del organizador — 1080×1920.
 * Pública: resuelve el organizer por slug y cuenta sus torneos vigentes.
 */
import {
  getPublicOrganizerBySlug,
  getActiveTournaments,
} from '@/lib/public/calendar'
import { getBaseUrl } from '@/lib/url'
import { buildStory, loadLogoDataUrl } from '@/lib/og/story'
import { themeAccent } from '@/lib/branding/themes'
import { logoPublicUrl } from '@/lib/branding/logo'

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const organizer = await getPublicOrganizerBySlug(slug)
  if (!organizer) return new Response('Not found', { status: 404 })

  const [tournaments, baseUrl, logoDataUrl] = await Promise.all([
    getActiveTournaments(organizer.id),
    getBaseUrl(),
    loadLogoDataUrl(logoPublicUrl(organizer.logo_path)),
  ])

  const count = tournaments.length
  const subtitle =
    count > 0
      ? `${count} ${count === 1 ? 'torneo vigente' : 'torneos vigentes'}`
      : 'Próximamente, nuevos torneos'

  return buildStory({
    eyebrow: 'Calendario',
    title: organizer.establishment_name,
    subtitle,
    url: `${baseUrl}/o/${slug}`,
    caption: 'Mirá los torneos',
    accent: themeAccent(organizer.theme_key),
    logoDataUrl,
  })
}
