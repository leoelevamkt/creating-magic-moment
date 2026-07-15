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
      agenda_blocks: {
        Row: {
          block_date: string | null
          created_at: string
          end_time: string
          id: string
          kind: string
          notes: string | null
          owner_id: string
          recurrence: string
          start_time: string
          title: string
          updated_at: string
          weekday: number | null
        }
        Insert: {
          block_date?: string | null
          created_at?: string
          end_time: string
          id?: string
          kind?: string
          notes?: string | null
          owner_id: string
          recurrence?: string
          start_time: string
          title: string
          updated_at?: string
          weekday?: number | null
        }
        Update: {
          block_date?: string | null
          created_at?: string
          end_time?: string
          id?: string
          kind?: string
          notes?: string | null
          owner_id?: string
          recurrence?: string
          start_time?: string
          title?: string
          updated_at?: string
          weekday?: number | null
        }
        Relationships: []
      }
      anamneses: {
        Row: {
          created_at: string
          created_by: string
          desenvolvimento: string | null
          historia_atual: string | null
          historia_escolar: string | null
          historia_familiar: string | null
          historia_medica: string | null
          historia_social: string | null
          id: string
          medicacoes: string | null
          observacoes: string | null
          patient_id: string
          queixa_principal: string | null
          transcript: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          desenvolvimento?: string | null
          historia_atual?: string | null
          historia_escolar?: string | null
          historia_familiar?: string | null
          historia_medica?: string | null
          historia_social?: string | null
          id?: string
          medicacoes?: string | null
          observacoes?: string | null
          patient_id: string
          queixa_principal?: string | null
          transcript?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          desenvolvimento?: string | null
          historia_atual?: string | null
          historia_escolar?: string | null
          historia_familiar?: string | null
          historia_medica?: string | null
          historia_social?: string | null
          id?: string
          medicacoes?: string | null
          observacoes?: string | null
          patient_id?: string
          queixa_principal?: string | null
          transcript?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "anamneses_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: true
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      app_user_connections: {
        Row: {
          account_email: string | null
          connection_key_ciphertext: string
          connector_id: string
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          account_email?: string | null
          connection_key_ciphertext: string
          connector_id: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          account_email?: string | null
          connection_key_ciphertext?: string
          connector_id?: string
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          details: string | null
          entity_id: string
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          details?: string | null
          entity_id: string
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          details?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      evaluations: {
        Row: {
          created_at: string
          created_by: string
          id: string
          modality: string
          patient_id: string
          scheduled_at: string | null
          status: string
          synthesis: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          modality: string
          patient_id: string
          scheduled_at?: string | null
          status?: string
          synthesis?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          modality?: string
          patient_id?: string
          scheduled_at?: string | null
          status?: string
          synthesis?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "evaluations_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          kind: string
          notes: string | null
          paid_at: string | null
          patient_id: string | null
          payment_method: string | null
          session_id: string | null
          status: string
          transaction_date: string
          updated_at: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          kind: string
          notes?: string | null
          paid_at?: string | null
          patient_id?: string | null
          payment_method?: string | null
          session_id?: string | null
          status?: string
          transaction_date?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          kind?: string
          notes?: string | null
          paid_at?: string | null
          patient_id?: string | null
          payment_method?: string | null
          session_id?: string | null
          status?: string
          transaction_date?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "sessions_plan"
            referencedColumns: ["id"]
          },
        ]
      }
      material_movements: {
        Row: {
          author_id: string
          created_at: string
          id: string
          kind: string
          material_id: string
          quantity: number
          reason: string | null
        }
        Insert: {
          author_id: string
          created_at?: string
          id?: string
          kind: string
          material_id: string
          quantity: number
          reason?: string | null
        }
        Update: {
          author_id?: string
          created_at?: string
          id?: string
          kind?: string
          material_id?: string
          quantity?: number
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_movements_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "materials"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          category: string
          created_at: string
          id: string
          min_quantity: number
          name: string
          notes: string | null
          quantity: number
          unit: string
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          id?: string
          min_quantity?: number
          name: string
          notes?: string | null
          quantity?: number
          unit?: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          min_quantity?: number
          name?: string
          notes?: string | null
          quantity?: number
          unit?: string
          updated_at?: string
        }
        Relationships: []
      }
      patient_documents: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          mime_type: string | null
          name: string
          patient_id: string
          size_bytes: number | null
          storage_path: string
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          mime_type?: string | null
          name: string
          patient_id: string
          size_bytes?: number | null
          storage_path: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          mime_type?: string | null
          name?: string
          patient_id?: string
          size_bytes?: number | null
          storage_path?: string
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_documents_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_forms: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          expires_at: string | null
          fields: Json
          id: string
          patient_id: string
          responses: Json | null
          status: string
          submitted_at: string | null
          title: string
          token: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          fields?: Json
          id?: string
          patient_id: string
          responses?: Json | null
          status?: string
          submitted_at?: string | null
          title: string
          token?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          expires_at?: string | null
          fields?: Json
          id?: string
          patient_id?: string
          responses?: Json | null
          status?: string
          submitted_at?: string | null
          title?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_forms_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_notes: {
        Row: {
          checklist: Json
          color: string
          content: string
          created_at: string
          created_by: string
          id: string
          patient_id: string
          pinned: boolean
          planned_tests: string | null
          session_dates: string[]
          session_number: number | null
          title: string
          updated_at: string
        }
        Insert: {
          checklist?: Json
          color?: string
          content?: string
          created_at?: string
          created_by: string
          id?: string
          patient_id: string
          pinned?: boolean
          planned_tests?: string | null
          session_dates?: string[]
          session_number?: number | null
          title?: string
          updated_at?: string
        }
        Update: {
          checklist?: Json
          color?: string
          content?: string
          created_at?: string
          created_by?: string
          id?: string
          patient_id?: string
          pinned?: boolean
          planned_tests?: string | null
          session_dates?: string[]
          session_number?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_notes_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          birth_date: string | null
          city: string | null
          cpf: string | null
          created_at: string
          created_by: string
          emergency_contact: Json | null
          guardians: Json
          has_guardians: boolean
          hypotheses: string | null
          id: string
          medications: string | null
          name: string
          notes: string | null
          overall_synthesis: string | null
          phone: string | null
          professionals: Json
          schooling: string | null
          sex: string | null
          status: string
          updated_at: string
        }
        Insert: {
          birth_date?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          created_by: string
          emergency_contact?: Json | null
          guardians?: Json
          has_guardians?: boolean
          hypotheses?: string | null
          id?: string
          medications?: string | null
          name: string
          notes?: string | null
          overall_synthesis?: string | null
          phone?: string | null
          professionals?: Json
          schooling?: string | null
          sex?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          birth_date?: string | null
          city?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string
          emergency_contact?: Json | null
          guardians?: Json
          has_guardians?: boolean
          hypotheses?: string | null
          id?: string
          medications?: string | null
          name?: string
          notes?: string | null
          overall_synthesis?: string | null
          phone?: string | null
          professionals?: Json
          schooling?: string | null
          sex?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          action: string
          blocked_until: string | null
          count: number
          id: string
          key: string
          updated_at: string
          window_start: string
        }
        Insert: {
          action: string
          blocked_until?: string | null
          count?: number
          id?: string
          key: string
          updated_at?: string
          window_start?: string
        }
        Update: {
          action?: string
          blocked_until?: string | null
          count?: number
          id?: string
          key?: string
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      screenings: {
        Row: {
          ai_analysis: string | null
          created_at: string
          created_by: string
          criteria: Json
          domain: string | null
          id: string
          instrument: string
          notes: string | null
          patient_id: string
          score: number | null
          updated_at: string
        }
        Insert: {
          ai_analysis?: string | null
          created_at?: string
          created_by: string
          criteria?: Json
          domain?: string | null
          id?: string
          instrument: string
          notes?: string | null
          patient_id: string
          score?: number | null
          updated_at?: string
        }
        Update: {
          ai_analysis?: string | null
          created_at?: string
          created_by?: string
          criteria?: Json
          domain?: string | null
          id?: string
          instrument?: string
          notes?: string | null
          patient_id?: string
          score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "screenings_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions_plan: {
        Row: {
          checklist: Json
          create_meet: boolean
          created_at: string
          created_by: string
          end_time: string | null
          google_event_id: string | null
          id: string
          meet_url: string | null
          modality: string
          notes: string | null
          objectives: string | null
          patient_id: string
          planned_test_ids: string[]
          session_date: string
          session_number: number | null
          start_time: string | null
          status: string
          title: string
          transcript: string | null
          updated_at: string
        }
        Insert: {
          checklist?: Json
          create_meet?: boolean
          created_at?: string
          created_by: string
          end_time?: string | null
          google_event_id?: string | null
          id?: string
          meet_url?: string | null
          modality?: string
          notes?: string | null
          objectives?: string | null
          patient_id: string
          planned_test_ids?: string[]
          session_date: string
          session_number?: number | null
          start_time?: string | null
          status?: string
          title?: string
          transcript?: string | null
          updated_at?: string
        }
        Update: {
          checklist?: Json
          create_meet?: boolean
          created_at?: string
          created_by?: string
          end_time?: string | null
          google_event_id?: string | null
          id?: string
          meet_url?: string | null
          modality?: string
          notes?: string | null
          objectives?: string | null
          patient_id?: string
          planned_test_ids?: string[]
          session_date?: string
          session_number?: number | null
          start_time?: string | null
          status?: string
          title?: string
          transcript?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_plan_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      supervision_cases: {
        Row: {
          created_at: string
          evolution: string | null
          hypothesis: string | null
          id: string
          owner_id: string
          patient_id: string | null
          questions: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          evolution?: string | null
          hypothesis?: string | null
          id?: string
          owner_id: string
          patient_id?: string | null
          questions?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          evolution?: string | null
          hypothesis?: string | null
          id?: string
          owner_id?: string
          patient_id?: string | null
          questions?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supervision_cases_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      supervision_notes: {
        Row: {
          author_id: string
          body: string
          case_id: string
          created_at: string
          id: string
        }
        Insert: {
          author_id: string
          body: string
          case_id: string
          created_at?: string
          id?: string
        }
        Update: {
          author_id?: string
          body?: string
          case_id?: string
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supervision_notes_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "supervision_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          color: string
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          id: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          color?: string
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          id?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          color?: string
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          id?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      test_catalog: {
        Row: {
          acronym: string | null
          age_range: string | null
          application_mode: string | null
          category: string
          created_at: string
          estimated_minutes: number | null
          id: string
          name: string
          notes: string | null
          source: string
          status: string
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          acronym?: string | null
          age_range?: string | null
          application_mode?: string | null
          category: string
          created_at?: string
          estimated_minutes?: number | null
          id?: string
          name: string
          notes?: string | null
          source: string
          status?: string
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          acronym?: string | null
          age_range?: string | null
          application_mode?: string | null
          category?: string
          created_at?: string
          estimated_minutes?: number | null
          id?: string
          name?: string
          notes?: string | null
          source?: string
          status?: string
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      test_tasks: {
        Row: {
          admin_notes: string | null
          approved_at: string | null
          approved_by: string | null
          assignee_id: string | null
          classification: string | null
          completed_at: string | null
          correction_notes: string | null
          created_at: string
          duration_minutes: number | null
          evaluation_id: string
          id: string
          patient_id: string
          raw_score: string | null
          scheduled_at: string | null
          standard_score: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["task_status"]
          synthesis: string | null
          test_id: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          assignee_id?: string | null
          classification?: string | null
          completed_at?: string | null
          correction_notes?: string | null
          created_at?: string
          duration_minutes?: number | null
          evaluation_id: string
          id?: string
          patient_id: string
          raw_score?: string | null
          scheduled_at?: string | null
          standard_score?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          synthesis?: string | null
          test_id: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          assignee_id?: string | null
          classification?: string | null
          completed_at?: string | null
          correction_notes?: string | null
          created_at?: string
          duration_minutes?: number | null
          evaluation_id?: string
          id?: string
          patient_id?: string
          raw_score?: string | null
          scheduled_at?: string | null
          standard_score?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          synthesis?: string | null
          test_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_tasks_evaluation_id_fkey"
            columns: ["evaluation_id"]
            isOneToOne: false
            referencedRelation: "evaluations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_tasks_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "test_tasks_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "test_catalog"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          id: string
          modality: string | null
          notes: string | null
          patient_id: string | null
          patient_name: string | null
          preferred_end_time: string | null
          preferred_start_time: string | null
          preferred_weekdays: number[] | null
          priority: number
          session_type: string | null
          status: string
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          modality?: string | null
          notes?: string | null
          patient_id?: string | null
          patient_name?: string | null
          preferred_end_time?: string | null
          preferred_start_time?: string | null
          preferred_weekdays?: number[] | null
          priority?: number
          session_type?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          modality?: string | null
          notes?: string | null
          patient_id?: string | null
          patient_name?: string | null
          preferred_end_time?: string | null
          preferred_start_time?: string | null
          preferred_weekdays?: number[] | null
          priority?: number
          session_type?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      work_sessions: {
        Row: {
          created_at: string
          ended_at: string | null
          id: string
          note: string | null
          started_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          ended_at?: string | null
          id?: string
          note?: string | null
          started_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          ended_at?: string | null
          id?: string
          note?: string | null
          started_at?: string
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
      check_rate_limit: {
        Args: {
          _action: string
          _block_seconds?: number
          _increment?: number
          _key: string
          _max: number
          _window_seconds: number
        }
        Returns: {
          allowed: boolean
          current_count: number
          retry_after: number
        }[]
      }
      cleanup_rate_limits: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      reset_rate_limit: {
        Args: { _action: string; _key: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "staff"
      task_status: "todo" | "correcting" | "review" | "approved"
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
    Enums: {
      app_role: ["admin", "staff"],
      task_status: ["todo", "correcting", "review", "approved"],
    },
  },
} as const
