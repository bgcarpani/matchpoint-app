/**
 * Lecturas públicas del calendario del organizador para la página /o/[slug].
 *
 * Usa el cliente anon (server) que sólo puede leer las vistas seguras
 * `public_organizer_view` (resolución por slug) y `public_calendar_tournament_view`
 * (torneos vigentes). No expone PII.
 *
 * Se hacen DOS lecturas (organizer por slug → torneos por organizer_id) en vez
 * de un join único: así un slug válido sin torneos activos resuelve igual el
 * encabezado (en vez de devolver 0 filas → 404 indebido). Ver spec-v2 Feature 1.
 */
import { createClient } from '@/lib/supabase/server'
import type {
  CategoryType,
  Gender,
  TournamentStatus,
} from '@/lib/types/database'

export interface PublicOrganizer {
  id: string
  establishment_name: string
  calendar_slug: string
  /** Branding del organizador (v3.2). */
  theme_key: string
  logo_path: string | null
  address: string | null
  maps_url: string | null
}

export interface CalendarTournament {
  id: string
  name: string
  category_type: CategoryType
  category_value: string
  gender: Gender
  tournament_date: string
  status: TournamentStatus
}

export async function getPublicOrganizerBySlug(
  slug: string
): Promise<PublicOrganizer | null> {
  // Sólo el alfabeto del slug (base32 sin ambiguos); descarta entradas raras.
  if (!/^[2-9a-z]{8}$/.test(slug)) return null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('public_organizer_view')
    .select(
      'id, establishment_name, calendar_slug, theme_key, logo_path, address, maps_url'
    )
    .eq('calendar_slug', slug)
    .maybeSingle()

  if (error || !data) return null
  return data
}

export async function getActiveTournaments(
  organizerId: string
): Promise<CalendarTournament[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('public_calendar_tournament_view')
    .select(
      'id, name, category_type, category_value, gender, tournament_date, status'
    )
    .eq('organizer_id', organizerId)
    .order('tournament_date', { ascending: true })

  if (error || !data) return []
  return data
}
