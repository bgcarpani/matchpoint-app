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
  /** Branding del organizador (v3.2): paleta, logo, dirección. */
  theme_key: string
  logo_path: string | null
  address: string | null
  maps_url: string | null
  courts: { id: string; name: string; type: CourtType }[]
  /** parejas aceptadas (cupos confirmados ocupados) */
  accepted_pairs: number
  /** solicitudes pendientes (cola de cupo; aceptar/rechazar libera lugar) */
  requested_pairs: number
  /** true cuando hay zonas publicadas → habilita ver /t/[id]/zones */
  zones_published: boolean
}

export interface PublicLiveMatch {
  id: string
  team1Label: string
  team2Label: string
  courtName: string | null
  zoneName: string
}

export interface PublicMatchPulse {
  /** zonas publicadas (para el stat strip) */
  zonesCount: number
  /** partidos aún por jugar en zonas publicadas (con cancha primero) */
  pending: PublicLiveMatch[]
}

const pairLabel = (p1: string, p2: string) => `${p1} / ${p2}`

/**
 * "Pulso" del torneo en vivo para la página pública: cantidad de zonas
 * publicadas + los partidos que todavía no se jugaron. Los partidos no tienen
 * estado `in_progress` ni horario en el modelo (van de `pending` a `finished`),
 * así que "lo que se está jugando" se representa con los `pending` —los
 * asignados a una cancha se muestran primero (son los que están en juego ahora).
 */
export async function getPublicMatchPulse(
  tournamentId: string
): Promise<PublicMatchPulse> {
  if (!/^[0-9a-f-]{36}$/i.test(tournamentId)) return { zonesCount: 0, pending: [] }

  const supabase = await createClient()

  // RLS limita a zonas publicadas del torneo.
  const { data: zones } = await supabase
    .from('zones')
    .select('id, name')
    .eq('tournament_id', tournamentId)

  if (!zones || zones.length === 0) return { zonesCount: 0, pending: [] }

  const zoneIds = zones.map((z) => z.id)
  const zoneName = new Map(zones.map((z) => [z.id, z.name]))

  const [{ data: matches }, { data: pairView }, { data: courts }] =
    await Promise.all([
      supabase
        .from('matches')
        .select('id, zone_id, court_id, team1_pair_id, team2_pair_id, status')
        .in('zone_id', zoneIds)
        .eq('status', 'pending'),
      supabase
        .from('public_pair_view')
        .select('id, player1_name, player2_name')
        .eq('tournament_id', tournamentId),
      supabase
        .from('public_court_view')
        .select('id, name')
        .eq('tournament_id', tournamentId),
    ])

  const label = new Map(
    (pairView ?? []).map((p) => [p.id, pairLabel(p.player1_name, p.player2_name)])
  )
  const courtName = new Map((courts ?? []).map((c) => [c.id, c.name]))

  const pending: PublicLiveMatch[] = (matches ?? [])
    // sólo cruces ya definidos (ambas parejas presentes)
    .filter((m) => m.team1_pair_id && m.team2_pair_id)
    .map((m) => ({
      id: m.id,
      team1Label: label.get(m.team1_pair_id ?? '') ?? '—',
      team2Label: label.get(m.team2_pair_id ?? '') ?? '—',
      courtName: m.court_id ? (courtName.get(m.court_id) ?? null) : null,
      zoneName: zoneName.get(m.zone_id ?? '') ?? '—',
    }))
    // con cancha asignada primero (los que están sobre la cancha)
    .sort((a, b) => Number(Boolean(b.courtName)) - Number(Boolean(a.courtName)))

  return { zonesCount: zones.length, pending }
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
