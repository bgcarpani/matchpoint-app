/**
 * Imagen de historia (Instagram) del calendario del organizador — 1080×1920.
 * Pública: resuelve el organizer por slug y cuenta sus torneos vigentes. El
 * estilo del afiche llega por `?style=a|b|c|d` (default 'a'). El estilo 'd' (mini
 * calendario del mes) además lee `?month=YYYY-MM` (default: mes actual).
 */
import {
  getPublicOrganizerBySlug,
  getActiveTournaments,
} from '@/lib/public/calendar'
import { getBaseUrl } from '@/lib/url'
import { loadLogoDataUrl } from '@/lib/og/story'
import {
  buildCalendarStory,
  type CalendarStyle,
  type CalendarMonth,
} from '@/lib/og/calendar-story'
import { themeAccent } from '@/lib/branding/themes'
import { logoPublicUrl } from '@/lib/branding/logo'

const STYLES: ReadonlySet<CalendarStyle> = new Set(['a', 'b', 'c', 'd'])

/** '2026-07' → { year: 2026, month: 7 } válido, o el mes actual si no parsea. */
function parseMonth(raw: string | null): { year: number; month: number } {
  const m = raw?.match(/^(\d{4})-(0[1-9]|1[0-2])$/)
  if (m) return { year: Number(m[1]), month: Number(m[2]) }
  const now = new Date()
  return { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 }
}

/** Etiqueta "Julio 2026" (es-AR, inicial mayúscula). */
function monthLabel(year: number, month: number): string {
  const name = new Intl.DateTimeFormat('es-AR', {
    month: 'long',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)))
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${year}`
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params
  const organizer = await getPublicOrganizerBySlug(slug)
  if (!organizer) return new Response('Not found', { status: 404 })

  const search = new URL(req.url).searchParams
  const raw = search.get('style')
  const style: CalendarStyle = STYLES.has(raw as CalendarStyle)
    ? (raw as CalendarStyle)
    : 'a'

  const [tournaments, baseUrl, logoDataUrl] = await Promise.all([
    getActiveTournaments(organizer.id),
    getBaseUrl(),
    loadLogoDataUrl(logoPublicUrl(organizer.logo_path)),
  ])

  // Estilo 'd': mini calendario del mes pedido (días con torneo resaltados).
  let month: CalendarMonth | undefined
  if (style === 'd') {
    const { year, month: m } = parseMonth(search.get('month'))
    const prefix = `${year}-${String(m).padStart(2, '0')}`
    const inMonth = tournaments.filter((t) =>
      t.tournament_date.startsWith(prefix)
    )
    const days = [
      ...new Set(inMonth.map((t) => Number(t.tournament_date.slice(8, 10)))),
    ]
    month = { year, month: m, label: monthLabel(year, m), days, count: inMonth.length }
  }

  return buildCalendarStory({
    style,
    establishmentName: organizer.establishment_name,
    tournamentCount: tournaments.length,
    url: `${baseUrl}/o/${slug}`,
    accent: themeAccent(organizer.theme_key),
    logoDataUrl,
    month,
  })
}
