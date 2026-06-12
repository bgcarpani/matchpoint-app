/**
 * Tipos de la base de datos — escritos a mano para reflejar
 * `supabase/migrations/0001_initial_schema.sql`.
 *
 * Cuando se conecte un proyecto Supabase real, este archivo puede regenerarse con:
 *   npx supabase gen types typescript --project-id <id> > src/lib/types/database.ts
 * Mantener la forma `Database` para que el cliente tipado siga funcionando.
 */

// --- Enums (deben coincidir con los CREATE TYPE de la migración) ---
export type CourtType = 'outdoor' | 'indoor'

export type TournamentStatus =
  | 'draft'
  | 'published'
  | 'registration_open'
  | 'registration_closed'
  | 'in_progress'
  | 'finished'

export type CategoryType = 'individual' | 'suma'

export type Gender = 'male' | 'female' | 'mixed'

export type PairStatus = 'pending' | 'accepted' | 'rejected'

export type MatchStatus = 'pending' | 'in_progress' | 'finished'

// Helper: una columna con default puede omitirse en Insert.
type WithDefaults<Row, OptionalKeys extends keyof Row> = Omit<Row, OptionalKeys> &
  Partial<Pick<Row, OptionalKeys>>

export interface Database {
  public: {
    Tables: {
      organizers: {
        Row: {
          id: string
          email: string
          full_name: string
          establishment_name: string
          created_at: string
        }
        Insert: WithDefaults<Database['public']['Tables']['organizers']['Row'], 'created_at'>
        Update: Partial<Database['public']['Tables']['organizers']['Row']>
        Relationships: []
      }
      courts: {
        Row: {
          id: string
          organizer_id: string
          name: string
          type: CourtType
          created_at: string
        }
        Insert: WithDefaults<
          Database['public']['Tables']['courts']['Row'],
          'id' | 'created_at'
        >
        Update: Partial<Database['public']['Tables']['courts']['Row']>
        Relationships: []
      }
      tournaments: {
        Row: {
          id: string
          organizer_id: string
          name: string
          status: TournamentStatus
          category_type: CategoryType
          category_value: string
          gender: Gender
          tournament_date: string
          registration_opens_at: string | null
          max_pair_requests: number
          max_pairs: number
          created_at: string
        }
        Insert: WithDefaults<
          Database['public']['Tables']['tournaments']['Row'],
          'id' | 'status' | 'registration_opens_at' | 'created_at'
        >
        Update: Partial<Database['public']['Tables']['tournaments']['Row']>
        Relationships: []
      }
      players: {
        Row: {
          id: string
          full_name: string
          email: string | null
          phone: string | null
          dni: string | null
          created_at: string
        }
        Insert: WithDefaults<
          Database['public']['Tables']['players']['Row'],
          'id' | 'email' | 'phone' | 'dni' | 'created_at'
        >
        Update: Partial<Database['public']['Tables']['players']['Row']>
        Relationships: []
      }
      pairs: {
        Row: {
          id: string
          tournament_id: string
          player1_id: string
          player2_id: string
          lookup_token: string
          status: PairStatus
          created_at: string
          updated_at: string
        }
        Insert: WithDefaults<
          Database['public']['Tables']['pairs']['Row'],
          'id' | 'status' | 'created_at' | 'updated_at'
        >
        Update: Partial<Database['public']['Tables']['pairs']['Row']>
        Relationships: []
      }
      zones: {
        Row: {
          id: string
          tournament_id: string
          name: string
          is_published: boolean
          created_at: string
        }
        Insert: WithDefaults<
          Database['public']['Tables']['zones']['Row'],
          'id' | 'is_published' | 'created_at'
        >
        Update: Partial<Database['public']['Tables']['zones']['Row']>
        Relationships: []
      }
      zone_pairs: {
        Row: {
          id: string
          zone_id: string
          pair_id: string
          position: number | null
          points: number
        }
        Insert: WithDefaults<
          Database['public']['Tables']['zone_pairs']['Row'],
          'id' | 'position' | 'points'
        >
        Update: Partial<Database['public']['Tables']['zone_pairs']['Row']>
        Relationships: []
      }
      matches: {
        Row: {
          id: string
          zone_id: string | null
          court_id: string | null
          round: number
          team1_pair_id: string
          team2_pair_id: string
          team1_score: number | null
          team2_score: number | null
          status: MatchStatus
          created_at: string
        }
        Insert: WithDefaults<
          Database['public']['Tables']['matches']['Row'],
          'id' | 'zone_id' | 'court_id' | 'team1_score' | 'team2_score' | 'status' | 'created_at'
        >
        Update: Partial<Database['public']['Tables']['matches']['Row']>
        Relationships: []
      }
    }
    Views: {
      public_tournament_view: {
        Row: {
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
          accepted_pairs: number
          requested_pairs: number
          zones_published: boolean
        }
        Relationships: []
      }
      public_pair_view: {
        Row: {
          id: string
          tournament_id: string
          status: PairStatus
          player1_id: string
          player2_id: string
          player1_name: string
          player2_name: string
        }
        Relationships: []
      }
      public_court_view: {
        Row: {
          id: string
          name: string
          type: CourtType
          tournament_id: string
        }
        Relationships: []
      }
    }
    Functions: {
      owns_tournament: {
        Args: { t_id: string }
        Returns: boolean
      }
      generate_zones: {
        Args: { p_tournament_id: string; p_num_zones: number }
        Returns: undefined
      }
      move_pair_to_zone: {
        Args: { p_pair_id: string; p_target_zone_id: string }
        Returns: undefined
      }
      register_pair: {
        Args: {
          p_tournament_id: string
          p1_full_name: string
          p1_email: string
          p1_phone: string
          p1_dni: string
          p2_full_name: string
          p2_email: string
          p2_phone: string
          p2_dni: string
        }
        Returns: string
      }
      remove_pair: {
        Args: { p_pair_id: string }
        Returns: undefined
      }
    }
    Enums: {
      court_type: CourtType
      tournament_status: TournamentStatus
      category_type: CategoryType
      gender: Gender
      pair_status: PairStatus
      match_status: MatchStatus
    }
  }
}

// Atajos de fila por entidad
export type Organizer = Database['public']['Tables']['organizers']['Row']
export type Court = Database['public']['Tables']['courts']['Row']
export type Tournament = Database['public']['Tables']['tournaments']['Row']
export type Player = Database['public']['Tables']['players']['Row']
export type Pair = Database['public']['Tables']['pairs']['Row']
export type Zone = Database['public']['Tables']['zones']['Row']
export type ZonePair = Database['public']['Tables']['zone_pairs']['Row']
export type Match = Database['public']['Tables']['matches']['Row']
