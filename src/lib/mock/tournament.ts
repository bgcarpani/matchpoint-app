/**
 * Datos mock para construir la UI pública del torneo sin Supabase conectado.
 *
 * SEAM: en el slice de inscripción, reemplazar `getPublicTournament` por una
 * query real (anon client + RLS: tournaments con status <> 'draft', join a
 * organizers y courts, y conteo de pairs por status). La forma del objeto
 * devuelto (`PublicTournamentView`) es la que consume la página.
 */
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
  /** solicitudes recibidas (lista de espera ocupada) */
  requested_pairs: number
  /** true cuando hay zonas publicadas → habilita ver /t/[id]/zones */
  zones_published: boolean
}

const MOCK: PublicTournamentView = {
  id: 'demo',
  name: 'Torneo Apertura 2026',
  status: 'registration_open',
  category_type: 'individual',
  category_value: '6ta',
  gender: 'mixed',
  tournament_date: '2026-07-18',
  registration_opens_at: null,
  max_pairs: 16,
  max_pair_requests: 24,
  establishment_name: 'Club Costa Pádel',
  courts: [
    { id: 'c1', name: 'Cancha 1', type: 'indoor' },
    { id: 'c2', name: 'Cancha 2', type: 'indoor' },
    { id: 'c3', name: 'Cancha 3', type: 'outdoor' },
  ],
  accepted_pairs: 11,
  requested_pairs: 18,
  zones_published: false,
}

export async function getPublicTournament(
  id: string
): Promise<PublicTournamentView | null> {
  // TODO(slice inscripción): reemplazar por query Supabase.
  return { ...MOCK, id }
}
