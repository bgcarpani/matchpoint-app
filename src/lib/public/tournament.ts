/**
 * Lectura pública del torneo para la página /t/[id].
 *
 * Usa el cliente anon (server) que sólo puede leer `public_tournament_view`
 * (columnas seguras + conteos de parejas, ver migración 0004). Las filas de
 * pairs/players NO se exponen a anon.
 */
import { createClient } from '@/lib/supabase/server'
import type {
  CategoryType,
  CourtType,
  Gender,
  TournamentStatus,
} from '@/lib/types/database'

export interface PublicTournamentView {
  id: string
  name: string
  status: TournamentStatus
  category_type: CategoryType
  category_value: string
  gender: Gender
  tournament_date: string
  registration_opens_at: string | null
  max_pairs: number
  max_pair_requests: number
  establishment_name: string
  courts: { id: string; name: string; type: CourtType }[]
  /** parejas aceptadas (cupos confirmados ocupados) */
  accepted_pairs: number
  /** solicitudes recibidas: pendientes + aceptadas (lista de espera ocupada) */
  requested_pairs: number
  /** true cuando hay zonas publicadas → habilita ver /t/[id]/zones */
  zones_published: boolean
}

export async function getPublicTournament(
  id: string
): Promise<PublicTournamentView | null> {
  // Un id no-uuid hace fallar la query → se trata como no encontrado.
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('public_tournament_view')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error || !data) return null

  // Canchas "en juego": las asignadas a partidos de zonas publicadas (vista
  // segura por torneo). Antes de publicar zonas, devuelve [].
  const { data: courts } = await supabase
    .from('public_court_view')
    .select('id, name, type')
    .eq('tournament_id', id)

  return { ...data, courts: courts ?? [] }
}
