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
import { categoryLabel, GENDER_LABELS } from '@/lib/domain/tournament'

const STYLES: ReadonlySet<CalendarStyle> = new Set(['a', 'b', 'c', 'd'])

/** '2026-07' → { year: 2026, month: 7 } válido, o el mes actual si no parsea. */
function parseMonth(raw: string | null): { year: number; month: number } {
  const now = new Date()
  const defaultMonth = { year: now.getUTCFullYear(), month: now.getUTCMonth() + 1 }
  const m = raw?.match(/^(\d{4})-(0[1-9]|1[0-2])$/)
  if (!m) return defaultMonth
  const year = Number(m[1])
  // Rechazar años fuera de rango para evitar queries sin sentido.
  if (year < defaultMonth.year - 1 || year > defaultMonth.year + 2) return defaultMonth
  return { year, month: Number(m[2]) }
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
  const style: CalendarStyle = raw !== null && STYLES.has(raw as CalendarStyle)
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
    const monthTournaments = inMonth
      .map((t) => ({
        day: Number(t.tournament_date.slice(8, 10)),
        categoryLabel: categoryLabel(t.category_type, t.category_value),
        genderLabel: GENDER_LABELS[t.gender],
      }))
      .sort((a, b) => a.day - b.day)
    month = {
      year,
      month: m,
      label: monthLabel(year, m),
      days,
      count: inMonth.length,
      tournaments: monthTournaments,
    }
  }

  const image = await buildCalendarStory({
    style,
    establishmentName: organizer.establishment_name,
    tournamentCount: tournaments.length,
    url: `${baseUrl}/o/${slug}`,
    accent: themeAccent(organizer.theme_key),
    logoDataUrl,
    month,
  })
  const headers = new Headers(image.headers)
  headers.set('Cache-Control', 'public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800')
  return new Response(image.body, { headers, status: image.status })
}
