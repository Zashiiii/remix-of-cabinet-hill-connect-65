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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      announcements: {
        Row: {
          announcement_type: string | null
          content: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          title: string
          updated_at: string | null
        }
        Insert: {
          announcement_type?: string | null
          content: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          title: string
          updated_at?: string | null
        }
        Update: {
          announcement_type?: string | null
          content?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "announcements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff_users"
            referencedColumns: ["id"]
          },
        ]
      }
      certificate_audit_trail: {
        Row: {
          action: string
          action_details: string | null
          control_number: string
          id: string
          ip_address: string | null
          new_status: string | null
          performed_by: string
          performed_by_role: string | null
          previous_status: string | null
          request_id: string | null
          timestamp: string | null
        }
        Insert: {
          action: string
          action_details?: string | null
          control_number: string
          id?: string
          ip_address?: string | null
          new_status?: string | null
          performed_by: string
          performed_by_role?: string | null
          previous_status?: string | null
          request_id?: string | null
          timestamp?: string | null
        }
        Update: {
          action?: string
          action_details?: string | null
          control_number?: string
          id?: string
          ip_address?: string | null
          new_status?: string | null
          performed_by?: string
          performed_by_role?: string | null
          previous_status?: string | null
          request_id?: string | null
          timestamp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificate_audit_trail_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "certificate_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      certificate_requests: {
        Row: {
          admin_notes: string | null
          amount_paid: number | null
          certificate_type: string
          control_number: string
          id: string
          or_number: string | null
          priority: string | null
          processed_by: string | null
          processed_date: string | null
          purpose: string
          ready_date: string | null
          rejection_category: string | null
          rejection_reason: string | null
          released_by: string | null
          released_date: string | null
          requested_date: string | null
          resident_contact: string | null
          resident_email: string | null
          resident_id: string | null
          resident_name: string
          resident_notes: string | null
          status: string | null
        }
        Insert: {
          admin_notes?: string | null
          amount_paid?: number | null
          certificate_type: string
          control_number: string
          id?: string
          or_number?: string | null
          priority?: string | null
          processed_by?: string | null
          processed_date?: string | null
          purpose: string
          ready_date?: string | null
          rejection_category?: string | null
          rejection_reason?: string | null
          released_by?: string | null
          released_date?: string | null
          requested_date?: string | null
          resident_contact?: string | null
          resident_email?: string | null
          resident_id?: string | null
          resident_name: string
          resident_notes?: string | null
          status?: string | null
        }
        Update: {
          admin_notes?: string | null
          amount_paid?: number | null
          certificate_type?: string
          control_number?: string
          id?: string
          or_number?: string | null
          priority?: string | null
          processed_by?: string | null
          processed_date?: string | null
          purpose?: string
          ready_date?: string | null
          rejection_category?: string | null
          rejection_reason?: string | null
          released_by?: string | null
          released_date?: string | null
          requested_date?: string | null
          resident_contact?: string | null
          resident_email?: string | null
          resident_id?: string | null
          resident_name?: string
          resident_notes?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "certificate_requests_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      health_records: {
        Row: {
          aware_of_igos_ngos: boolean | null
          children_born_alive: number | null
          children_born_dead: number | null
          children_still_birth: number | null
          created_at: string | null
          dead_adults_count: number | null
          dead_children_count: number | null
          family_planning_acceptor: boolean | null
          family_planning_method: string | null
          household_id: string | null
          id: string
          igo_assistance_type: string | null
          illness_diarrhea: boolean | null
          illness_others: string | null
          illness_underweight: boolean | null
          illness_uti: boolean | null
          illness_weakness: boolean | null
          illness_worms: boolean | null
          uses_government_hospital: boolean | null
          uses_health_center: boolean | null
          uses_hilot: boolean | null
          uses_private_doctor: boolean | null
          uses_private_hospital: boolean | null
        }
        Insert: {
          aware_of_igos_ngos?: boolean | null
          children_born_alive?: number | null
          children_born_dead?: number | null
          children_still_birth?: number | null
          created_at?: string | null
          dead_adults_count?: number | null
          dead_children_count?: number | null
          family_planning_acceptor?: boolean | null
          family_planning_method?: string | null
          household_id?: string | null
          id?: string
          igo_assistance_type?: string | null
          illness_diarrhea?: boolean | null
          illness_others?: string | null
          illness_underweight?: boolean | null
          illness_uti?: boolean | null
          illness_weakness?: boolean | null
          illness_worms?: boolean | null
          uses_government_hospital?: boolean | null
          uses_health_center?: boolean | null
          uses_hilot?: boolean | null
          uses_private_doctor?: boolean | null
          uses_private_hospital?: boolean | null
        }
        Update: {
          aware_of_igos_ngos?: boolean | null
          children_born_alive?: number | null
          children_born_dead?: number | null
          children_still_birth?: number | null
          created_at?: string | null
          dead_adults_count?: number | null
          dead_children_count?: number | null
          family_planning_acceptor?: boolean | null
          family_planning_method?: string | null
          household_id?: string | null
          id?: string
          igo_assistance_type?: string | null
          illness_diarrhea?: boolean | null
          illness_others?: string | null
          illness_underweight?: boolean | null
          illness_uti?: boolean | null
          illness_weakness?: boolean | null
          illness_worms?: boolean | null
          uses_government_hospital?: boolean | null
          uses_health_center?: boolean | null
          uses_hilot?: boolean | null
          uses_private_doctor?: boolean | null
          uses_private_hospital?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "health_records_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          date_registered: string | null
          drainage_facility: string | null
          electricity_source: string | null
          food_service: string | null
          food_storage_dried: boolean | null
          food_storage_fresh: boolean | null
          food_storage_processed: boolean | null
          garbage_disposal: string | null
          has_cabinet_shelves: boolean | null
          has_cellular: boolean | null
          has_internet: boolean | null
          has_postal_service: boolean | null
          has_refrigerator: boolean | null
          has_telephone: boolean | null
          house_number: string | null
          house_ownership: string | null
          household_number: string
          housing_type: string | null
          id: string
          lot_ownership: string | null
          monthly_household_income: number | null
          number_of_members: number | null
          purok: string
          street: string | null
          toilet_facility: string | null
          transportation_private_car: boolean | null
          transportation_pub: boolean | null
          transportation_puj: boolean | null
          transportation_taxi: boolean | null
          water_source_level: string | null
          water_source_type: string | null
          water_storage: string | null
        }
        Insert: {
          date_registered?: string | null
          drainage_facility?: string | null
          electricity_source?: string | null
          food_service?: string | null
          food_storage_dried?: boolean | null
          food_storage_fresh?: boolean | null
          food_storage_processed?: boolean | null
          garbage_disposal?: string | null
          has_cabinet_shelves?: boolean | null
          has_cellular?: boolean | null
          has_internet?: boolean | null
          has_postal_service?: boolean | null
          has_refrigerator?: boolean | null
          has_telephone?: boolean | null
          house_number?: string | null
          house_ownership?: string | null
          household_number: string
          housing_type?: string | null
          id?: string
          lot_ownership?: string | null
          monthly_household_income?: number | null
          number_of_members?: number | null
          purok: string
          street?: string | null
          toilet_facility?: string | null
          transportation_private_car?: boolean | null
          transportation_pub?: boolean | null
          transportation_puj?: boolean | null
          transportation_taxi?: boolean | null
          water_source_level?: string | null
          water_source_type?: string | null
          water_storage?: string | null
        }
        Update: {
          date_registered?: string | null
          drainage_facility?: string | null
          electricity_source?: string | null
          food_service?: string | null
          food_storage_dried?: boolean | null
          food_storage_fresh?: boolean | null
          food_storage_processed?: boolean | null
          garbage_disposal?: string | null
          has_cabinet_shelves?: boolean | null
          has_cellular?: boolean | null
          has_internet?: boolean | null
          has_postal_service?: boolean | null
          has_refrigerator?: boolean | null
          has_telephone?: boolean | null
          house_number?: string | null
          house_ownership?: string | null
          household_number?: string
          housing_type?: string | null
          id?: string
          lot_ownership?: string | null
          monthly_household_income?: number | null
          number_of_members?: number | null
          purok?: string
          street?: string | null
          toilet_facility?: string | null
          transportation_private_car?: boolean | null
          transportation_pub?: boolean | null
          transportation_puj?: boolean | null
          transportation_taxi?: boolean | null
          water_source_level?: string | null
          water_source_type?: string | null
          water_storage?: string | null
        }
        Relationships: []
      }
      immunization_records: {
        Row: {
          bcg_immunized: boolean | null
          child_name: string
          created_at: string | null
          date_of_birth: string
          dpt_immunized: boolean | null
          id: string
          measles_immunized: boolean | null
          opv_immunized: boolean | null
          others_immunized: string | null
          resident_id: string | null
        }
        Insert: {
          bcg_immunized?: boolean | null
          child_name: string
          created_at?: string | null
          date_of_birth: string
          dpt_immunized?: boolean | null
          id?: string
          measles_immunized?: boolean | null
          opv_immunized?: boolean | null
          others_immunized?: string | null
          resident_id?: string | null
        }
        Update: {
          bcg_immunized?: boolean | null
          child_name?: string
          created_at?: string | null
          date_of_birth?: string
          dpt_immunized?: boolean | null
          id?: string
          measles_immunized?: boolean | null
          opv_immunized?: boolean | null
          others_immunized?: string | null
          resident_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "immunization_records_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      residents: {
        Row: {
          age: number | null
          birth_date: string
          civil_status: string
          contact_number: string | null
          created_by: string | null
          date_registered: string | null
          educational_attainment: string | null
          email: string | null
          employment_status: string | null
          first_name: string
          four_ps_beneficiary: boolean | null
          house_number: string | null
          household_number: string
          id: string
          indigenous_people: boolean | null
          last_name: string
          last_updated: string | null
          middle_name: string | null
          monthly_income_cash: number | null
          occupation: string | null
          purok: string
          pwd_status: boolean | null
          relation_to_head: string | null
          religion: string | null
          resident_status: string | null
          senior_citizen: boolean | null
          sex: string
          solo_parent: boolean | null
          street: string | null
          suffix: string | null
          voter_status: boolean | null
        }
        Insert: {
          age?: number | null
          birth_date: string
          civil_status: string
          contact_number?: string | null
          created_by?: string | null
          date_registered?: string | null
          educational_attainment?: string | null
          email?: string | null
          employment_status?: string | null
          first_name: string
          four_ps_beneficiary?: boolean | null
          house_number?: string | null
          household_number: string
          id?: string
          indigenous_people?: boolean | null
          last_name: string
          last_updated?: string | null
          middle_name?: string | null
          monthly_income_cash?: number | null
          occupation?: string | null
          purok: string
          pwd_status?: boolean | null
          relation_to_head?: string | null
          religion?: string | null
          resident_status?: string | null
          senior_citizen?: boolean | null
          sex: string
          solo_parent?: boolean | null
          street?: string | null
          suffix?: string | null
          voter_status?: boolean | null
        }
        Update: {
          age?: number | null
          birth_date?: string
          civil_status?: string
          contact_number?: string | null
          created_by?: string | null
          date_registered?: string | null
          educational_attainment?: string | null
          email?: string | null
          employment_status?: string | null
          first_name?: string
          four_ps_beneficiary?: boolean | null
          house_number?: string | null
          household_number?: string
          id?: string
          indigenous_people?: boolean | null
          last_name?: string
          last_updated?: string | null
          middle_name?: string | null
          monthly_income_cash?: number | null
          occupation?: string | null
          purok?: string
          pwd_status?: boolean | null
          relation_to_head?: string | null
          religion?: string | null
          resident_status?: string | null
          senior_citizen?: boolean | null
          sex?: string
          solo_parent?: boolean | null
          street?: string | null
          suffix?: string | null
          voter_status?: boolean | null
        }
        Relationships: []
      }
      sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          staff_id: string
          token: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          staff_id: string
          token: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          staff_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff_users"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_users: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          last_login: string | null
          password_hash: string
          role: string | null
          updated_at: string | null
          username: string
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          password_hash: string
          role?: string | null
          updated_at?: string | null
          username: string
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          password_hash?: string
          role?: string | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_active_announcements: {
        Args: never
        Returns: {
          announcement_type: string
          content: string
          created_at: string
          id: string
          title: string
        }[]
      }
      get_pending_requests: {
        Args: never
        Returns: {
          certificate_type: string
          id: string
          purpose: string
          requested_date: string
          resident_contact: string
          resident_email: string
          resident_name: string
          status: string
        }[]
      }
      verify_resident_exists: {
        Args: { p_resident_id: string }
        Returns: {
          residency_months: number
          resident_found: boolean
          resident_name: string
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
