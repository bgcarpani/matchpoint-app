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

export type ScoringMode = 'games' | 'best_of_3_sets'

export type MatchFormat = 'round_robin' | 'winner_vs_loser' | 'manual'

export type MatchPhase = 'zone' | 'bracket'

export type TeamSlot = 'team1' | 'team2'

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
          calendar_slug: string
          created_at: string
        }
        Insert: WithDefaults<
          Database['public']['Tables']['organizers']['Row'],
          'calendar_slug' | 'created_at'
        >
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
          scoring_mode: ScoringMode
          games_per_set: number
          qualifiers_per_zone: number
          bracket_published: boolean
          created_at: string
        }
        Insert: WithDefaults<
          Database['public']['Tables']['tournaments']['Row'],
          | 'id'
          | 'status'
          | 'registration_opens_at'
          | 'scoring_mode'
          | 'games_per_set'
          | 'qualifiers_per_zone'
          | 'bracket_published'
          | 'created_at'
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
          deposit_paid_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: WithDefaults<
          Database['public']['Tables']['pairs']['Row'],
          'id' | 'status' | 'deposit_paid_at' | 'created_at' | 'updated_at'
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
          match_format: MatchFormat
          standings_frozen: boolean
          created_at: string
        }
        Insert: WithDefaults<
          Database['public']['Tables']['zones']['Row'],
          'id' | 'is_published' | 'match_format' | 'standings_frozen' | 'created_at'
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
          tournament_id: string | null
          court_id: string | null
          round: number
          phase: MatchPhase
          bracket_round: number | null
          bracket_slot: number | null
          next_match_id: string | null
          next_slot: TeamSlot | null
          team1_pair_id: string | null
          team2_pair_id: string | null
          team1_score: number | null
          team2_score: number | null
          score_detail: number[][] | null
          winner_pair_id: string | null
          status: MatchStatus
          created_at: string
        }
        Insert: WithDefaults<
          Database['public']['Tables']['matches']['Row'],
          | 'id'
          | 'zone_id'
          | 'tournament_id'
          | 'court_id'
          | 'phase'
          | 'bracket_round'
          | 'bracket_slot'
          | 'next_match_id'
          | 'next_slot'
          | 'team1_pair_id'
          | 'team2_pair_id'
          | 'team1_score'
          | 'team2_score'
          | 'score_detail'
          | 'winner_pair_id'
          | 'status'
          | 'created_at'
        >
        Update: Partial<Database['public']['Tables']['matches']['Row']>
        Relationships: []
      }
    }
    Views: {
      public_organizer_view: {
        Row: {
          id: string
          establishment_name: string
          calendar_slug: string
        }
        Relationships: []
      }
      public_calendar_tournament_view: {
        Row: {
          id: string
          organizer_id: string
          name: string
          category_type: CategoryType
          category_value: string
          gender: Gender
          tournament_date: string
          status: TournamentStatus
        }
        Relationships: []
      }
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
      zone_standings_view: {
        Row: {
          zone_id: string
          pair_id: string
          played: number
          won: number
          lost: number
          games_for: number
          games_against: number
          games_diff: number
          points: number
        }
        Relationships: []
      }
      public_bracket_view: {
        Row: {
          id: string
          tournament_id: string
          bracket_round: number | null
          bracket_slot: number | null
          team1_pair_id: string | null
          team2_pair_id: string | null
          team1_score: number | null
          team2_score: number | null
          score_detail: number[][] | null
          winner_pair_id: string | null
          status: MatchStatus
          next_match_id: string | null
          next_slot: TeamSlot | null
          court_id: string | null
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
      generate_zone_matches: {
        Args: { p_zone_id: string; p_format: MatchFormat }
        Returns: undefined
      }
      generate_next_zone_round: {
        Args: { p_zone_id: string }
        Returns: undefined
      }
      freeze_zone_standings: {
        Args: { p_zone_id: string }
        Returns: undefined
      }
      freeze_manual_standings: {
        Args: { p_zone_id: string; p_pair_ids: string[] }
        Returns: undefined
      }
      reopen_zone_standings: {
        Args: { p_zone_id: string }
        Returns: undefined
      }
      generate_bracket: {
        Args: { p_tournament_id: string }
        Returns: undefined
      }
      record_bracket_result: {
        Args: {
          p_match_id: string
          p_team1_score: number
          p_team2_score: number
          p_score_detail: number[][] | null
          p_winner_pair_id: string
        }
        Returns: undefined
      }
      clear_bracket_result: {
        Args: { p_match_id: string }
        Returns: undefined
      }
      swap_bracket_participants: {
        Args: { p_pair_a: string; p_pair_b: string }
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
      delete_tournament: {
        Args: { p_tournament_id: string }
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
      scoring_mode: ScoringMode
      match_format: MatchFormat
      match_phase: MatchPhase
      team_slot: TeamSlot
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
