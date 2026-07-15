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
      baseline_task_definitions: {
        Row: {
          completion_mode: string
          definition_version: number
          description: string
          id: string
          is_active: boolean
          mandatory: boolean
          source_order: number
          title: string
        }
        Insert: {
          completion_mode: string
          definition_version?: number
          description: string
          id: string
          is_active?: boolean
          mandatory: boolean
          source_order: number
          title: string
        }
        Update: {
          completion_mode?: string
          definition_version?: number
          description?: string
          id?: string
          is_active?: boolean
          mandatory?: boolean
          source_order?: number
          title?: string
        }
        Relationships: []
      }
      candidate_baseline_setups: {
        Row: {
          candidate_id: string
          created_at: string
          formal_training_started_at: string | null
          formal_training_started_by_display_name: string | null
          formal_training_started_by_user_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          formal_training_started_at?: string | null
          formal_training_started_by_display_name?: string | null
          formal_training_started_by_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          formal_training_started_at?: string | null
          formal_training_started_by_display_name?: string | null
          formal_training_started_by_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_baseline_setups_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: true
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_baseline_setups_formal_training_started_by_user__fkey"
            columns: ["formal_training_started_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      candidate_baseline_tasks: {
        Row: {
          candidate_id: string
          completed_at: string | null
          completed_by_display_name: string | null
          completed_by_user_id: string | null
          definition_id: string
          id: string
          note: string
          status: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          completed_at?: string | null
          completed_by_display_name?: string | null
          completed_by_user_id?: string | null
          definition_id: string
          id?: string
          note?: string
          status?: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          completed_at?: string | null
          completed_by_display_name?: string | null
          completed_by_user_id?: string | null
          definition_id?: string
          id?: string
          note?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_baseline_tasks_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_baseline_setups"
            referencedColumns: ["candidate_id"]
          },
          {
            foreignKeyName: "candidate_baseline_tasks_completed_by_user_id_fkey"
            columns: ["completed_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "candidate_baseline_tasks_definition_id_fkey"
            columns: ["definition_id"]
            isOneToOne: false
            referencedRelation: "baseline_task_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
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
      candidate_pathway_lcc_strands: {
        Row: {
          candidate_id: string
          strand_code: string
        }
        Insert: {
          candidate_id: string
          strand_code: string
        }
        Update: {
          candidate_id?: string
          strand_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_pathway_lcc_strands_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_pathways"
            referencedColumns: ["candidate_id"]
          },
        ]
      }
      candidate_pathway_specialist_routes: {
        Row: {
          candidate_id: string
          route_code: string
        }
        Insert: {
          candidate_id: string
          route_code: string
        }
        Update: {
          candidate_id?: string
          route_code?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_pathway_specialist_routes_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidate_pathways"
            referencedColumns: ["candidate_id"]
          },
        ]
      }
      candidate_pathways: {
        Row: {
          academic_route: string
          candidate_id: string
          cibse_membership_target: string
          created_at: string
          current_membership_status: string
          engineering_registration_target: string
          iet_membership_target: string
          notes: string
          primary_outcome: string
          professional_body: string
          updated_at: string
        }
        Insert: {
          academic_route?: string
          candidate_id: string
          cibse_membership_target: string
          created_at?: string
          current_membership_status?: string
          engineering_registration_target: string
          iet_membership_target: string
          notes?: string
          primary_outcome: string
          professional_body: string
          updated_at?: string
        }
        Update: {
          academic_route?: string
          candidate_id?: string
          cibse_membership_target?: string
          created_at?: string
          current_membership_status?: string
          engineering_registration_target?: string
          iet_membership_target?: string
          notes?: string
          primary_outcome?: string
          professional_body?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_pathways_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: true
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
        ]
      }
      candidate_relationships: {
        Row: {
          candidate_id: string
          created_at: string
          display_name: string
          ends_at: string | null
          id: string
          relationship_type: string
          starts_at: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          candidate_id: string
          created_at?: string
          display_name: string
          ends_at?: string | null
          id?: string
          relationship_type: string
          starts_at?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          candidate_id?: string
          created_at?: string
          display_name?: string
          ends_at?: string | null
          id?: string
          relationship_type?: string
          starts_at?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "candidate_relationships_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_relationships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      candidate_reviews: {
        Row: {
          candidate_id: string
          created_at: string
          id: string
          next_review_date: string | null
          notes: string
          outcome: string
          reviewed_by_display_name: string
          reviewed_by_user_id: string | null
          reviewed_on: string | null
          updated_at: string
        }
        Insert: {
          candidate_id: string
          created_at?: string
          id?: string
          next_review_date?: string | null
          notes?: string
          outcome: string
          reviewed_by_display_name: string
          reviewed_by_user_id?: string | null
          reviewed_on?: string | null
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          created_at?: string
          id?: string
          next_review_date?: string | null
          notes?: string
          outcome?: string
          reviewed_by_display_name?: string
          reviewed_by_user_id?: string | null
          reviewed_on?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "candidate_reviews_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "candidate_reviews_reviewed_by_user_id_fkey"
            columns: ["reviewed_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
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
      competency_cycle_reviews: {
        Row: {
          candidate_competency_id: string
          candidate_id: string
          created_at: string
          cycle_id: string
          id: string
          next_action: string | null
          recommendation: string
          reviewed_at: string
          reviewed_by_display_name: string
          reviewed_by_user_id: string | null
          status: string
        }
        Insert: {
          candidate_competency_id: string
          candidate_id: string
          created_at?: string
          cycle_id: string
          id?: string
          next_action?: string | null
          recommendation: string
          reviewed_at: string
          reviewed_by_display_name: string
          reviewed_by_user_id?: string | null
          status: string
        }
        Update: {
          candidate_competency_id?: string
          candidate_id?: string
          created_at?: string
          cycle_id?: string
          id?: string
          next_action?: string | null
          recommendation?: string
          reviewed_at?: string
          reviewed_by_display_name?: string
          reviewed_by_user_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "competency_cycle_reviews_candidate_competency_fkey"
            columns: ["candidate_id", "candidate_competency_id"]
            isOneToOne: false
            referencedRelation: "candidate_competencies"
            referencedColumns: ["candidate_id", "id"]
          },
          {
            foreignKeyName: "competency_cycle_reviews_cycle_fkey"
            columns: ["candidate_competency_id", "cycle_id"]
            isOneToOne: false
            referencedRelation: "competency_cycles"
            referencedColumns: ["candidate_competency_id", "id"]
          },
          {
            foreignKeyName: "competency_cycle_reviews_reviewed_by_user_id_fkey"
            columns: ["reviewed_by_user_id"]
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
      cpd_attachments: {
        Row: {
          added_at: string
          added_by_user_id: string | null
          cpd_entry_id: string
          display_filename: string
          id: string
          storage_key: string
        }
        Insert: {
          added_at?: string
          added_by_user_id?: string | null
          cpd_entry_id: string
          display_filename: string
          id?: string
          storage_key: string
        }
        Update: {
          added_at?: string
          added_by_user_id?: string | null
          cpd_entry_id?: string
          display_filename?: string
          id?: string
          storage_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "cpd_attachments_added_by_user_id_fkey"
            columns: ["added_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "cpd_attachments_cpd_entry_id_fkey"
            columns: ["cpd_entry_id"]
            isOneToOne: false
            referencedRelation: "cpd_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      cpd_competency_links: {
        Row: {
          accepted_at: string | null
          accepted_by_display_name: string | null
          accepted_by_user_id: string | null
          competency_definition_id: string
          cpd_entry_id: string
          created_at: string
          id: string
          link_type: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by_display_name?: string | null
          accepted_by_user_id?: string | null
          competency_definition_id: string
          cpd_entry_id: string
          created_at?: string
          id?: string
          link_type: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by_display_name?: string | null
          accepted_by_user_id?: string | null
          competency_definition_id?: string
          cpd_entry_id?: string
          created_at?: string
          id?: string
          link_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "cpd_competency_links_accepted_by_user_id_fkey"
            columns: ["accepted_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "cpd_competency_links_competency_definition_id_fkey"
            columns: ["competency_definition_id"]
            isOneToOne: false
            referencedRelation: "competency_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cpd_competency_links_cpd_entry_id_fkey"
            columns: ["cpd_entry_id"]
            isOneToOne: false
            referencedRelation: "cpd_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      cpd_entries: {
        Row: {
          candidate_id: string
          category: string
          cpd_date: string
          created_at: string
          description: string
          hours: number
          id: string
          outcome: string
          signed_off_at: string | null
          signed_off_by_display_name: string | null
          signed_off_by_user_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          category: string
          cpd_date: string
          created_at?: string
          description?: string
          hours: number
          id?: string
          outcome?: string
          signed_off_at?: string | null
          signed_off_by_display_name?: string | null
          signed_off_by_user_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          category?: string
          cpd_date?: string
          created_at?: string
          description?: string
          hours?: number
          id?: string
          outcome?: string
          signed_off_at?: string | null
          signed_off_by_display_name?: string | null
          signed_off_by_user_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cpd_entries_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cpd_entries_signed_off_by_user_id_fkey"
            columns: ["signed_off_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      development_actions: {
        Row: {
          archive_reason: string | null
          archived_at: string | null
          archived_by_display_name: string | null
          archived_by_user_id: string | null
          candidate_competency_id: string
          candidate_id: string
          carried_forward_from_action_id: string | null
          completed_at: string | null
          completed_by_display_name: string | null
          completed_by_user_id: string | null
          created_at: string
          created_by_display_name: string
          created_by_user_id: string | null
          cycle_id: string
          due_date: string | null
          id: string
          notes: string
          owner: string
          priority: string
          source_standard_task_definition_id: string | null
          status: string
          submitted_at: string | null
          submitted_by_display_name: string | null
          submitted_by_user_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by_display_name?: string | null
          archived_by_user_id?: string | null
          candidate_competency_id: string
          candidate_id: string
          carried_forward_from_action_id?: string | null
          completed_at?: string | null
          completed_by_display_name?: string | null
          completed_by_user_id?: string | null
          created_at?: string
          created_by_display_name: string
          created_by_user_id?: string | null
          cycle_id: string
          due_date?: string | null
          id?: string
          notes?: string
          owner: string
          priority: string
          source_standard_task_definition_id?: string | null
          status: string
          submitted_at?: string | null
          submitted_by_display_name?: string | null
          submitted_by_user_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          archive_reason?: string | null
          archived_at?: string | null
          archived_by_display_name?: string | null
          archived_by_user_id?: string | null
          candidate_competency_id?: string
          candidate_id?: string
          carried_forward_from_action_id?: string | null
          completed_at?: string | null
          completed_by_display_name?: string | null
          completed_by_user_id?: string | null
          created_at?: string
          created_by_display_name?: string
          created_by_user_id?: string | null
          cycle_id?: string
          due_date?: string | null
          id?: string
          notes?: string
          owner?: string
          priority?: string
          source_standard_task_definition_id?: string | null
          status?: string
          submitted_at?: string | null
          submitted_by_display_name?: string | null
          submitted_by_user_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "development_actions_archived_by_user_id_fkey"
            columns: ["archived_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "development_actions_candidate_competency_fkey"
            columns: ["candidate_id", "candidate_competency_id"]
            isOneToOne: false
            referencedRelation: "candidate_competencies"
            referencedColumns: ["candidate_id", "id"]
          },
          {
            foreignKeyName: "development_actions_carried_forward_fkey"
            columns: ["candidate_id", "carried_forward_from_action_id"]
            isOneToOne: false
            referencedRelation: "development_actions"
            referencedColumns: ["candidate_id", "id"]
          },
          {
            foreignKeyName: "development_actions_completed_by_user_id_fkey"
            columns: ["completed_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "development_actions_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "development_actions_cycle_fkey"
            columns: ["candidate_competency_id", "cycle_id"]
            isOneToOne: false
            referencedRelation: "competency_cycles"
            referencedColumns: ["candidate_competency_id", "id"]
          },
          {
            foreignKeyName: "development_actions_source_standard_task_definition_id_fkey"
            columns: ["source_standard_task_definition_id"]
            isOneToOne: false
            referencedRelation: "standard_task_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "development_actions_submitted_by_user_id_fkey"
            columns: ["submitted_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      evidence_action_links: {
        Row: {
          created_at: string
          created_by_display_name: string
          created_by_user_id: string | null
          development_action_id: string
          evidence_id: string
          id: string
        }
        Insert: {
          created_at?: string
          created_by_display_name: string
          created_by_user_id?: string | null
          development_action_id: string
          evidence_id: string
          id?: string
        }
        Update: {
          created_at?: string
          created_by_display_name?: string
          created_by_user_id?: string | null
          development_action_id?: string
          evidence_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_action_links_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "evidence_action_links_development_action_id_fkey"
            columns: ["development_action_id"]
            isOneToOne: false
            referencedRelation: "development_actions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_action_links_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_competency_links: {
        Row: {
          accepted_at: string | null
          accepted_by_display_name: string | null
          accepted_by_user_id: string | null
          competency_definition_id: string
          created_at: string
          evidence_id: string
          id: string
          link_type: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by_display_name?: string | null
          accepted_by_user_id?: string | null
          competency_definition_id: string
          created_at?: string
          evidence_id: string
          id?: string
          link_type: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by_display_name?: string | null
          accepted_by_user_id?: string | null
          competency_definition_id?: string
          created_at?: string
          evidence_id?: string
          id?: string
          link_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_competency_links_accepted_by_user_id_fkey"
            columns: ["accepted_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "evidence_competency_links_competency_definition_id_fkey"
            columns: ["competency_definition_id"]
            isOneToOne: false
            referencedRelation: "competency_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_competency_links_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_entries: {
        Row: {
          candidate_id: string
          claimed_level: string
          cpd_category: string | null
          cpd_hours: number | null
          cpd_signed_off_at: string | null
          cpd_signed_off_by_display_name: string | null
          cpd_signed_off_by_user_id: string | null
          created_at: string
          description: string
          evidence_date: string
          id: string
          method: string
          outcome: string
          project_reference: string
          project_type: string
          riba_stage: string
          structured_sections: Json | null
          systems: string[]
          title: string
          updated_at: string
        }
        Insert: {
          candidate_id: string
          claimed_level: string
          cpd_category?: string | null
          cpd_hours?: number | null
          cpd_signed_off_at?: string | null
          cpd_signed_off_by_display_name?: string | null
          cpd_signed_off_by_user_id?: string | null
          created_at?: string
          description: string
          evidence_date: string
          id?: string
          method: string
          outcome: string
          project_reference: string
          project_type: string
          riba_stage: string
          structured_sections?: Json | null
          systems?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          candidate_id?: string
          claimed_level?: string
          cpd_category?: string | null
          cpd_hours?: number | null
          cpd_signed_off_at?: string | null
          cpd_signed_off_by_display_name?: string | null
          cpd_signed_off_by_user_id?: string | null
          created_at?: string
          description?: string
          evidence_date?: string
          id?: string
          method?: string
          outcome?: string
          project_reference?: string
          project_type?: string
          riba_stage?: string
          structured_sections?: Json | null
          systems?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evidence_entries_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_entries_cpd_signed_off_by_user_id_fkey"
            columns: ["cpd_signed_off_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      evidence_verification_events: {
        Row: {
          actor_display_name: string
          actor_user_id: string | null
          created_at: string
          event_type: string
          evidence_id: string
          id: string
          occurred_at: string
          reason: string | null
        }
        Insert: {
          actor_display_name: string
          actor_user_id?: string | null
          created_at?: string
          event_type: string
          evidence_id: string
          id?: string
          occurred_at: string
          reason?: string | null
        }
        Update: {
          actor_display_name?: string
          actor_user_id?: string | null
          created_at?: string
          event_type?: string
          evidence_id?: string
          id?: string
          occurred_at?: string
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evidence_verification_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "evidence_verification_events_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "evidence_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          attendees: string
          candidate_comment: string
          candidate_id: string
          created_at: string
          created_by_display_name: string
          created_by_user_id: string | null
          duration: string
          id: string
          meeting_date: string
          meeting_type: string
          notes: string
          outcome: string
          review_id: string | null
          updated_at: string
        }
        Insert: {
          attendees: string
          candidate_comment?: string
          candidate_id: string
          created_at?: string
          created_by_display_name: string
          created_by_user_id?: string | null
          duration: string
          id?: string
          meeting_date: string
          meeting_type: string
          notes?: string
          outcome?: string
          review_id?: string | null
          updated_at?: string
        }
        Update: {
          attendees?: string
          candidate_comment?: string
          candidate_id?: string
          created_at?: string
          created_by_display_name?: string
          created_by_user_id?: string | null
          duration?: string
          id?: string
          meeting_date?: string
          meeting_type?: string
          notes?: string
          outcome?: string
          review_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "meetings_candidate_id_fkey"
            columns: ["candidate_id"]
            isOneToOne: false
            referencedRelation: "candidates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meetings_created_by_user_id_fkey"
            columns: ["created_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "meetings_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "candidate_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      mentor_assessments: {
        Row: {
          assessed_at: string | null
          assessed_by_display_name: string | null
          assessed_by_user_id: string | null
          candidate_competency_id: string
          candidate_id: string
          created_at: string
          cycle_id: string
          id: string
          next_action: string
          recommendation: string
          status: string
          updated_at: string
        }
        Insert: {
          assessed_at?: string | null
          assessed_by_display_name?: string | null
          assessed_by_user_id?: string | null
          candidate_competency_id: string
          candidate_id: string
          created_at?: string
          cycle_id: string
          id?: string
          next_action?: string
          recommendation: string
          status: string
          updated_at?: string
        }
        Update: {
          assessed_at?: string | null
          assessed_by_display_name?: string | null
          assessed_by_user_id?: string | null
          candidate_competency_id?: string
          candidate_id?: string
          created_at?: string
          cycle_id?: string
          id?: string
          next_action?: string
          recommendation?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mentor_assessments_assessed_by_user_id_fkey"
            columns: ["assessed_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "mentor_assessments_candidate_competency_fkey"
            columns: ["candidate_id", "candidate_competency_id"]
            isOneToOne: false
            referencedRelation: "candidate_competencies"
            referencedColumns: ["candidate_id", "id"]
          },
          {
            foreignKeyName: "mentor_assessments_cycle_fkey"
            columns: ["candidate_competency_id", "cycle_id"]
            isOneToOne: false
            referencedRelation: "competency_cycles"
            referencedColumns: ["candidate_competency_id", "id"]
          },
        ]
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
      progression_events: {
        Row: {
          approval_authority: string | null
          candidate_competency_id: string
          candidate_id: string
          created_at: string
          cycle_id: string
          destination_cycle_id: string | null
          event_type: string
          evidence_basis: string | null
          from_level: string | null
          id: string
          import_source_reference: string | null
          is_imported: boolean
          level: string | null
          manager_signed_off_at: string | null
          manager_signed_off_by_display_name: string | null
          manager_signed_off_by_user_id: string | null
          manager_signoff_confirmed: boolean | null
          mentor_approved_at: string | null
          mentor_approved_by_display_name: string | null
          mentor_approved_by_user_id: string | null
          occurred_at: string
          performed_by_display_name: string
          performed_by_user_id: string | null
          previous_cycle_id: string | null
          reason: string | null
          to_level: string | null
        }
        Insert: {
          approval_authority?: string | null
          candidate_competency_id: string
          candidate_id: string
          created_at?: string
          cycle_id: string
          destination_cycle_id?: string | null
          event_type: string
          evidence_basis?: string | null
          from_level?: string | null
          id?: string
          import_source_reference?: string | null
          is_imported?: boolean
          level?: string | null
          manager_signed_off_at?: string | null
          manager_signed_off_by_display_name?: string | null
          manager_signed_off_by_user_id?: string | null
          manager_signoff_confirmed?: boolean | null
          mentor_approved_at?: string | null
          mentor_approved_by_display_name?: string | null
          mentor_approved_by_user_id?: string | null
          occurred_at: string
          performed_by_display_name: string
          performed_by_user_id?: string | null
          previous_cycle_id?: string | null
          reason?: string | null
          to_level?: string | null
        }
        Update: {
          approval_authority?: string | null
          candidate_competency_id?: string
          candidate_id?: string
          created_at?: string
          cycle_id?: string
          destination_cycle_id?: string | null
          event_type?: string
          evidence_basis?: string | null
          from_level?: string | null
          id?: string
          import_source_reference?: string | null
          is_imported?: boolean
          level?: string | null
          manager_signed_off_at?: string | null
          manager_signed_off_by_display_name?: string | null
          manager_signed_off_by_user_id?: string | null
          manager_signoff_confirmed?: boolean | null
          mentor_approved_at?: string | null
          mentor_approved_by_display_name?: string | null
          mentor_approved_by_user_id?: string | null
          occurred_at?: string
          performed_by_display_name?: string
          performed_by_user_id?: string | null
          previous_cycle_id?: string | null
          reason?: string | null
          to_level?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "progression_events_candidate_competency_fkey"
            columns: ["candidate_id", "candidate_competency_id"]
            isOneToOne: false
            referencedRelation: "candidate_competencies"
            referencedColumns: ["candidate_id", "id"]
          },
          {
            foreignKeyName: "progression_events_cycle_fkey"
            columns: ["candidate_competency_id", "cycle_id"]
            isOneToOne: false
            referencedRelation: "competency_cycles"
            referencedColumns: ["candidate_competency_id", "id"]
          },
          {
            foreignKeyName: "progression_events_destination_cycle_fkey"
            columns: ["candidate_competency_id", "destination_cycle_id"]
            isOneToOne: false
            referencedRelation: "competency_cycles"
            referencedColumns: ["candidate_competency_id", "id"]
          },
          {
            foreignKeyName: "progression_events_manager_signed_off_by_user_id_fkey"
            columns: ["manager_signed_off_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "progression_events_mentor_approved_by_user_id_fkey"
            columns: ["mentor_approved_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "progression_events_performed_by_user_id_fkey"
            columns: ["performed_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "progression_events_previous_cycle_fkey"
            columns: ["candidate_competency_id", "previous_cycle_id"]
            isOneToOne: false
            referencedRelation: "competency_cycles"
            referencedColumns: ["candidate_competency_id", "id"]
          },
        ]
      }
      standard_task_definitions: {
        Row: {
          competency_references: string[]
          definition_version: number
          deliverable: string
          discipline: string
          due_period: string
          id: string
          is_active: boolean
          mentor_prompt: string
          owner: string
          priority: string
          source_order: number
          success_criteria: string
          suggested_level: string
          task_type: string
          title: string
        }
        Insert: {
          competency_references?: string[]
          definition_version?: number
          deliverable: string
          discipline: string
          due_period: string
          id: string
          is_active?: boolean
          mentor_prompt: string
          owner: string
          priority: string
          source_order: number
          success_criteria: string
          suggested_level: string
          task_type: string
          title: string
        }
        Update: {
          competency_references?: string[]
          definition_version?: number
          deliverable?: string
          discipline?: string
          due_period?: string
          id?: string
          is_active?: boolean
          mentor_prompt?: string
          owner?: string
          priority?: string
          source_order?: number
          success_criteria?: string
          suggested_level?: string
          task_type?: string
          title?: string
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
      complete_active_competency_cycle: {
        Args: {
          p_candidate_competency_id: string
          p_carry_forward_selections: Json
          p_evidence_basis: string
          p_manager_signed_off_at: string
          p_manager_signed_off_by_display_name: string
          p_manager_signed_off_by_user_id: string
          p_manager_signoff_confirmed: boolean
          p_mentor_assessment_id: string
          p_mentor_completed_at: string
          p_mentor_completed_by_display_name: string
          p_mentor_completed_by_user_id: string
          p_occurred_at: string
          p_performed_by_display_name: string
          p_reason: string
        }
        Returns: {
          completed_cycle_id: string
          destination_cycle_id: string
          progression_event_id: string
        }[]
      }
      initialize_candidate_competency: {
        Args: {
          p_candidate_id: string
          p_competency_definition_id: string
          p_initial_level: string
          p_occurred_at: string
          p_performed_by_display_name: string
          p_reason: string
        }
        Returns: {
          candidate_competency_id: string
          initial_cycle_id: string
        }[]
      }
      reopen_earlier_competency_level: {
        Args: {
          p_candidate_competency_id: string
          p_level: string
          p_occurred_at: string
          p_performed_by_display_name: string
          p_reason: string
          p_represented_cycle_ids: string[]
        }
        Returns: {
          reopened_cycle_id: string
          reopened_event_id: string
        }[]
      }
      reset_active_competency_cycle: {
        Args: {
          p_candidate_competency_id: string
          p_occurred_at: string
          p_performed_by_display_name: string
          p_reason: string
        }
        Returns: {
          locked_cycle_id: string
          opened_event_id: string
          replacement_cycle_id: string
          reset_event_id: string
        }[]
      }
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
