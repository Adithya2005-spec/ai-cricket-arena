export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      balls: {
        Row: {
          ball_in_over: number
          ball_number: number
          batsman_id: string | null
          bowler_id: string | null
          created_at: string
          id: string
          innings: number
          is_wicket: boolean
          match_id: string
          outcome: string
          over_no: number
          runs: number
        }
        Insert: {
          ball_in_over: number
          ball_number: number
          batsman_id?: string | null
          bowler_id?: string | null
          created_at?: string
          id?: string
          innings: number
          is_wicket?: boolean
          match_id: string
          outcome: string
          over_no: number
          runs?: number
        }
        Update: {
          ball_in_over?: number
          ball_number?: number
          batsman_id?: string | null
          bowler_id?: string | null
          created_at?: string
          id?: string
          innings?: number
          is_wicket?: boolean
          match_id?: string
          outcome?: string
          over_no?: number
          runs?: number
        }
        Relationships: [
          {
            foreignKeyName: "balls_batsman_id_fkey"
            columns: ["batsman_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balls_bowler_id_fkey"
            columns: ["bowler_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "balls_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      commentary: {
        Row: {
          ball_number: number
          created_at: string
          id: string
          is_wicket: boolean
          match_id: string
          outcome: string
          over_ball_label: string
          runs: number
          text: string
        }
        Insert: {
          ball_number: number
          created_at?: string
          id?: string
          is_wicket?: boolean
          match_id: string
          outcome: string
          over_ball_label: string
          runs?: number
          text: string
        }
        Update: {
          ball_number?: number
          created_at?: string
          id?: string
          is_wicket?: boolean
          match_id?: string
          outcome?: string
          over_ball_label?: string
          runs?: number
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "commentary_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      fixtures: {
        Row: {
          created_at: string
          id: string
          match_id: string | null
          round: string
          scheduled_order: number
          status: string
          team1_id: string
          team2_id: string
          tournament_id: string
          winner_team_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          match_id?: string | null
          round?: string
          scheduled_order?: number
          status?: string
          team1_id: string
          team2_id: string
          tournament_id: string
          winner_team_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          match_id?: string | null
          round?: string
          scheduled_order?: number
          status?: string
          team1_id?: string
          team2_id?: string
          tournament_id?: string
          winner_team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fixtures_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixtures_team1_id_fkey"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixtures_team2_id_fkey"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixtures_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixtures_winner_team_id_fkey"
            columns: ["winner_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          ai_commentary: boolean
          balls: number
          batting_team_id: string | null
          bowler_id: string | null
          bowling_team_id: string | null
          created_at: string
          current_innings: number
          fixture_id: string | null
          id: string
          innings1_balls: number | null
          innings1_batting_team_id: string | null
          innings1_score: number | null
          innings1_wickets: number | null
          non_striker_id: string | null
          score: number
          status: string
          striker_id: string | null
          target: number | null
          team1_id: string
          team2_id: string
          tournament_id: string | null
          updated_at: string
          wickets: number
          win_margin_text: string | null
          winner_team_id: string | null
        }
        Insert: {
          ai_commentary?: boolean
          balls?: number
          batting_team_id?: string | null
          bowler_id?: string | null
          bowling_team_id?: string | null
          created_at?: string
          current_innings?: number
          fixture_id?: string | null
          id?: string
          innings1_balls?: number | null
          innings1_batting_team_id?: string | null
          innings1_score?: number | null
          innings1_wickets?: number | null
          non_striker_id?: string | null
          score?: number
          status?: string
          striker_id?: string | null
          target?: number | null
          team1_id: string
          team2_id: string
          tournament_id?: string | null
          updated_at?: string
          wickets?: number
          win_margin_text?: string | null
          winner_team_id?: string | null
        }
        Update: {
          ai_commentary?: boolean
          balls?: number
          batting_team_id?: string | null
          bowler_id?: string | null
          bowling_team_id?: string | null
          created_at?: string
          current_innings?: number
          fixture_id?: string | null
          id?: string
          innings1_balls?: number | null
          innings1_batting_team_id?: string | null
          innings1_score?: number | null
          innings1_wickets?: number | null
          non_striker_id?: string | null
          score?: number
          status?: string
          striker_id?: string | null
          target?: number | null
          team1_id?: string
          team2_id?: string
          tournament_id?: string | null
          updated_at?: string
          wickets?: number
          win_margin_text?: string | null
          winner_team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_batting_team_id_fkey"
            columns: ["batting_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_bowler_id_fkey"
            columns: ["bowler_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_bowling_team_id_fkey"
            columns: ["bowling_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_innings1_batting_team_id_fkey"
            columns: ["innings1_batting_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_non_striker_id_fkey"
            columns: ["non_striker_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_striker_id_fkey"
            columns: ["striker_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team1_id_fkey"
            columns: ["team1_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_team2_id_fkey"
            columns: ["team2_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_winner_team_id_fkey"
            columns: ["winner_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          aggression: number
          batting: number
          batting_order: number
          bowler_type: string
          bowling: number
          created_at: string
          form: number
          id: string
          name: string
          role: string
          team_id: string | null
          vs_pace: number
          vs_spin: number
        }
        Insert: {
          aggression?: number
          batting?: number
          batting_order?: number
          bowler_type?: string
          bowling?: number
          created_at?: string
          form?: number
          id?: string
          name: string
          role: string
          team_id?: string | null
          vs_pace?: number
          vs_spin?: number
        }
        Update: {
          aggression?: number
          batting?: number
          batting_order?: number
          bowler_type?: string
          bowling?: number
          created_at?: string
          form?: number
          id?: string
          name?: string
          role?: string
          team_id?: string | null
          vs_pace?: number
          vs_spin?: number
        }
        Relationships: [
          {
            foreignKeyName: "players_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      standings: {
        Row: {
          balls_bowled: number
          balls_faced: number
          id: string
          losses: number
          nrr: number
          played: number
          points: number
          runs_against: number
          runs_for: number
          team_id: string
          tournament_id: string
          wins: number
        }
        Insert: {
          balls_bowled?: number
          balls_faced?: number
          id?: string
          losses?: number
          nrr?: number
          played?: number
          points?: number
          runs_against?: number
          runs_for?: number
          team_id: string
          tournament_id: string
          wins?: number
        }
        Update: {
          balls_bowled?: number
          balls_faced?: number
          id?: string
          losses?: number
          nrr?: number
          played?: number
          points?: number
          runs_against?: number
          runs_for?: number
          team_id?: string
          tournament_id?: string
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "standings_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "standings_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          short_name: string
          strength: number
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          short_name: string
          strength?: number
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          short_name?: string
          strength?: number
        }
        Relationships: []
      }
      tournaments: {
        Row: {
          created_at: string
          id: string
          name: string
          status: string
          winner_team_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          status?: string
          winner_team_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          status?: string
          winner_team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournaments_winner_team_id_fkey"
            columns: ["winner_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
