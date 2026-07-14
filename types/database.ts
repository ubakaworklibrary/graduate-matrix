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
      candidate_competencies: {
        Row: {
          active_cycle_id: string | null
          candidate_id: string
          competency_definition_id: string
          created_at: string
          id: string
          target_level_override: string | null
          updated_at: string
        }
        Insert: {
          active_cycle_id?: string | null
          candidate_id: string
          competency_definition_id: string
          created_at?: string
          id?: string
          target_level_override?: string | null
          updated_at?: string
        }
        Update: {
          active_cycle_id?: string | null
          candidate_id?: string
          competency_definition_id?: string
          created_at?: string
          id?: string
          target_level_override?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_competencies_active_cycle_ownership_fkey"
            columns: ["id", "active_cycle_id"]
            isOneToOne: false
            referencedRelation: "competency_cycles"
            referencedColumns: ["candidate_competency_id", "id"]
          },
          {
            foreignKeyName: "candidate_competencies_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_competencies_competency_definition_id_fkey"
            columns: ["competency_definition_id"]
            isOneToOne: false
            referencedRelation: "competency_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      candidates: {
        Row: {
          archived_at: string | null
          created_at: string
          discipline: string
          employer_team: string
          expected_application_date: string | null
          external_reference: string | null
          first_name: string
          id: string
          job_title: string
          office_location: string
          organization_id: string
          scheme_start_date: string | null
          surname: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          discipline: string
          employer_team: string
          expected_application_date?: string | null
          external_reference?: string | null
          first_name: string
          id?: string
          job_title: string
          office_location: string
          organization_id: string
          scheme_start_date?: string | null
          surname: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          discipline?: string
          employer_team?: string
          expected_application_date?: string | null
          external_reference?: string | null
          first_name?: string
          id?: string
          job_title?: string
          office_location?: string
          organization_id?: string
          scheme_start_date?: string | null
          surname?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      competency_cycles: {
        Row: {
          candidate_competency_id: string
          completed_at: string | null
          completed_by_display_name: string | null
          completed_by_user_id: string | null
          completion_reason: string
          created_at: string
          id: string
          level: string
          opened_at: string | null
          opened_by_display_name: string | null
          opened_by_user_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          candidate_competency_id: string
          completed_at?: string | null
          completed_by_display_name?: string | null
          completed_by_user_id?: string | null
          completion_reason?: string
          created_at?: string
          id?: string
          level: string
          opened_at?: string | null
          opened_by_display_name?: string | null
          opened_by_user_id?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          candidate_competency_id?: string
          completed_at?: string | null
          completed_by_display_name?: string | null
          completed_by_user_id?: string | null
          completion_reason?: string
          created_at?: string
          id?: string
          level?: string
          opened_at?: string | null
          opened_by_display_name?: string | null
          opened_by_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "competency_cycles_candidate_competency_id_fkey"
            columns: ["candidate_competency_id"]
            isOneToOne: false
            referencedRelation: "candidate_competencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competency_cycles_completed_by_user_id_fkey"
            columns: ["completed_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "competency_cycles_opened_by_user_id_fkey"
            columns: ["opened_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      competency_definitions: {
        Row: {
          id: string
          is_active: boolean
          reference: string
          source_order: number
        }
        Insert: {
          id: string
          is_active?: boolean
          reference: string
          source_order: number
        }
        Update: {
          id?: string
          is_active?: boolean
          reference?: string
          source_order?: number
        }
        Relationships: []
      }
      organization_memberships: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          membership_role: string
          organization_id: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          membership_role: string
          organization_id: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          membership_role?: string
          organization_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_memberships_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      organizations: {
        Row: {
          archived_at: string | null
          created_at: string
          id: string
          name: string
          slug: string | null
          updated_at: string
        }
        Insert: {
          archived_at?: string | null
          created_at?: string
          id?: string
          name: string
          slug?: string | null
          updated_at?: string
        }
        Update: {
          archived_at?: string | null
          created_at?: string
          id?: string
          name?: string
          slug?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string
          display_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          display_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          display_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
