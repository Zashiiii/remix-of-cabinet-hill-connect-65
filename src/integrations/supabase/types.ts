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
          content: string
          content_tl: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          title: string
          title_tl: string | null
          type: string | null
          updated_at: string | null
        }
        Insert: {
          content: string
          content_tl?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          title: string
          title_tl?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string
          content_tl?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          title?: string
          title_tl?: string | null
          type?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          performed_by: string
          performed_by_type: string
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          performed_by: string
          performed_by_type: string
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          performed_by?: string
          performed_by_type?: string
        }
        Relationships: []
      }
      certificate_audit_trail: {
        Row: {
          action: string
          created_at: string | null
          id: string
          notes: string | null
          performed_by: string | null
          request_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          notes?: string | null
          performed_by?: string | null
          request_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          notes?: string | null
          performed_by?: string | null
          request_id?: string | null
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
          birth_date: string | null
          certificate_type: string
          contact_number: string | null
          control_number: string
          created_at: string | null
          email: string | null
          full_name: string
          household_number: string | null
          id: string
          notes: string | null
          preferred_pickup_date: string | null
          priority: string | null
          processed_by: string | null
          purpose: string | null
          rejection_reason: string | null
          resident_id: string | null
          status: string | null
          updated_at: string | null
          uploaded_id_url: string | null
        }
        Insert: {
          birth_date?: string | null
          certificate_type: string
          contact_number?: string | null
          control_number: string
          created_at?: string | null
          email?: string | null
          full_name: string
          household_number?: string | null
          id?: string
          notes?: string | null
          preferred_pickup_date?: string | null
          priority?: string | null
          processed_by?: string | null
          purpose?: string | null
          rejection_reason?: string | null
          resident_id?: string | null
          status?: string | null
          updated_at?: string | null
          uploaded_id_url?: string | null
        }
        Update: {
          birth_date?: string | null
          certificate_type?: string
          contact_number?: string | null
          control_number?: string
          created_at?: string | null
          email?: string | null
          full_name?: string
          household_number?: string | null
          id?: string
          notes?: string | null
          preferred_pickup_date?: string | null
          priority?: string | null
          processed_by?: string | null
          purpose?: string | null
          rejection_reason?: string | null
          resident_id?: string | null
          status?: string | null
          updated_at?: string | null
          uploaded_id_url?: string | null
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
      certificate_templates: {
        Row: {
          certificate_type: string
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          name: string
          placeholders: Json | null
          template_content: string
          updated_at: string | null
        }
        Insert: {
          certificate_type: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          placeholders?: Json | null
          template_content: string
          updated_at?: string | null
        }
        Update: {
          certificate_type?: string
          created_at?: string | null
          created_by?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          placeholders?: Json | null
          template_content?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      health_records: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          notes: string | null
          record_date: string | null
          record_type: string | null
          resident_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          record_date?: string | null
          record_type?: string | null
          resident_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          notes?: string | null
          record_date?: string | null
          record_type?: string | null
          resident_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "health_records_resident_id_fkey"
            columns: ["resident_id"]
            isOneToOne: false
            referencedRelation: "residents"
            referencedColumns: ["id"]
          },
        ]
      }
      households: {
        Row: {
          address: string | null
          barangay: string | null
          city: string | null
          communication_services: Json | null
          created_at: string | null
          district: string | null
          drainage_facilities: Json | null
          dwelling_type: string | null
          ethnic_group: string | null
          food_service: Json | null
          food_storage_type: Json | null
          garbage_disposal: Json | null
          house_number: string | null
          house_ownership: string | null
          household_number: string
          household_storage: Json | null
          id: string
          info_sources: Json | null
          interview_date: string | null
          lighting_source: string | null
          lot_ownership: string | null
          means_of_transport: Json | null
          place_of_origin: string | null
          province: string | null
          street_purok: string | null
          toilet_facilities: Json | null
          updated_at: string | null
          water_storage: Json | null
          water_supply_level: string | null
          years_staying: number | null
        }
        Insert: {
          address?: string | null
          barangay?: string | null
          city?: string | null
          communication_services?: Json | null
          created_at?: string | null
          district?: string | null
          drainage_facilities?: Json | null
          dwelling_type?: string | null
          ethnic_group?: string | null
          food_service?: Json | null
          food_storage_type?: Json | null
          garbage_disposal?: Json | null
          house_number?: string | null
          house_ownership?: string | null
          household_number: string
          household_storage?: Json | null
          id?: string
          info_sources?: Json | null
          interview_date?: string | null
          lighting_source?: string | null
          lot_ownership?: string | null
          means_of_transport?: Json | null
          place_of_origin?: string | null
          province?: string | null
          street_purok?: string | null
          toilet_facilities?: Json | null
          updated_at?: string | null
          water_storage?: Json | null
          water_supply_level?: string | null
          years_staying?: number | null
        }
        Update: {
          address?: string | null
          barangay?: string | null
          city?: string | null
          communication_services?: Json | null
          created_at?: string | null
          district?: string | null
          drainage_facilities?: Json | null
          dwelling_type?: string | null
          ethnic_group?: string | null
          food_service?: Json | null
          food_storage_type?: Json | null
          garbage_disposal?: Json | null
          house_number?: string | null
          house_ownership?: string | null
          household_number?: string
          household_storage?: Json | null
          id?: string
          info_sources?: Json | null
          interview_date?: string | null
          lighting_source?: string | null
          lot_ownership?: string | null
          means_of_transport?: Json | null
          place_of_origin?: string | null
          province?: string | null
          street_purok?: string | null
          toilet_facilities?: Json | null
          updated_at?: string | null
          water_storage?: Json | null
          water_supply_level?: string | null
          years_staying?: number | null
        }
        Relationships: []
      }
      immunization_records: {
        Row: {
          administered_by: string | null
          created_at: string | null
          date_administered: string | null
          dose_number: number | null
          id: string
          notes: string | null
          resident_id: string | null
          updated_at: string | null
          vaccine_name: string
        }
        Insert: {
          administered_by?: string | null
          created_at?: string | null
          date_administered?: string | null
          dose_number?: number | null
          id?: string
          notes?: string | null
          resident_id?: string | null
          updated_at?: string | null
          vaccine_name: string
        }
        Update: {
          administered_by?: string | null
          created_at?: string | null
          date_administered?: string | null
          dose_number?: number | null
          id?: string
          notes?: string | null
          resident_id?: string | null
          updated_at?: string | null
          vaccine_name?: string
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
      incidents: {
        Row: {
          action_taken: string | null
          complainant_address: string | null
          complainant_contact: string | null
          complainant_name: string
          created_at: string | null
          handled_by: string | null
          id: string
          incident_date: string
          incident_description: string
          incident_location: string | null
          incident_number: string
          incident_type: string
          reported_by: string | null
          resolution_date: string | null
          resolution_notes: string | null
          respondent_address: string | null
          respondent_name: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          action_taken?: string | null
          complainant_address?: string | null
          complainant_contact?: string | null
          complainant_name: string
          created_at?: string | null
          handled_by?: string | null
          id?: string
          incident_date: string
          incident_description: string
          incident_location?: string | null
          incident_number: string
          incident_type: string
          reported_by?: string | null
          resolution_date?: string | null
          resolution_notes?: string | null
          respondent_address?: string | null
          respondent_name?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          action_taken?: string | null
          complainant_address?: string | null
          complainant_contact?: string | null
          complainant_name?: string
          created_at?: string | null
          handled_by?: string | null
          id?: string
          incident_date?: string
          incident_description?: string
          incident_location?: string | null
          incident_number?: string
          incident_type?: string
          reported_by?: string | null
          resolution_date?: string | null
          resolution_notes?: string | null
          respondent_address?: string | null
          respondent_name?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      login_attempts: {
        Row: {
          attempted_at: string
          id: string
          ip_address: string
          success: boolean
          username: string | null
        }
        Insert: {
          attempted_at?: string
          id?: string
          ip_address: string
          success?: boolean
          username?: string | null
        }
        Update: {
          attempted_at?: string
          id?: string
          ip_address?: string
          success?: boolean
          username?: string | null
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_read: boolean | null
          parent_message_id: string | null
          recipient_id: string
          recipient_type: string
          sender_id: string
          sender_type: string
          subject: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          parent_message_id?: string | null
          recipient_id: string
          recipient_type: string
          sender_id: string
          sender_type: string
          subject?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_read?: boolean | null
          parent_message_id?: string | null
          recipient_id?: string
          recipient_type?: string
          sender_id?: string
          sender_type?: string
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      residents: {
        Row: {
          approval_status: string | null
          approved_at: string | null
          approved_by: string | null
          birth_date: string | null
          civil_status: string | null
          contact_number: string | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          dialects_spoken: Json | null
          education_attainment: string | null
          email: string | null
          employment_category: string | null
          employment_status: string | null
          ethnic_group: string | null
          first_name: string
          gender: string | null
          household_id: string | null
          id: string
          is_head_of_household: boolean | null
          last_name: string
          livelihood_training: string | null
          middle_name: string | null
          monthly_income_cash: string | null
          monthly_income_kind: string | null
          occupation: string | null
          place_of_origin: string | null
          privacy_consent_given_at: string | null
          relation_to_head: string | null
          religion: string | null
          schooling_status: string | null
          suffix: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          birth_date?: string | null
          civil_status?: string | null
          contact_number?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          dialects_spoken?: Json | null
          education_attainment?: string | null
          email?: string | null
          employment_category?: string | null
          employment_status?: string | null
          ethnic_group?: string | null
          first_name: string
          gender?: string | null
          household_id?: string | null
          id?: string
          is_head_of_household?: boolean | null
          last_name: string
          livelihood_training?: string | null
          middle_name?: string | null
          monthly_income_cash?: string | null
          monthly_income_kind?: string | null
          occupation?: string | null
          place_of_origin?: string | null
          privacy_consent_given_at?: string | null
          relation_to_head?: string | null
          religion?: string | null
          schooling_status?: string | null
          suffix?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          approval_status?: string | null
          approved_at?: string | null
          approved_by?: string | null
          birth_date?: string | null
          civil_status?: string | null
          contact_number?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          dialects_spoken?: Json | null
          education_attainment?: string | null
          email?: string | null
          employment_category?: string | null
          employment_status?: string | null
          ethnic_group?: string | null
          first_name?: string
          gender?: string | null
          household_id?: string | null
          id?: string
          is_head_of_household?: boolean | null
          last_name?: string
          livelihood_training?: string | null
          middle_name?: string | null
          monthly_income_cash?: string | null
          monthly_income_kind?: string | null
          occupation?: string | null
          place_of_origin?: string | null
          privacy_consent_given_at?: string | null
          relation_to_head?: string | null
          religion?: string | null
          schooling_status?: string | null
          suffix?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "residents_household_id_fkey"
            columns: ["household_id"]
            isOneToOne: false
            referencedRelation: "households"
            referencedColumns: ["id"]
          },
        ]
      }
      sessions: {
        Row: {
          created_at: string | null
          expires_at: string
          id: string
          staff_user_id: string | null
          token: string
        }
        Insert: {
          created_at?: string | null
          expires_at: string
          id?: string
          staff_user_id?: string | null
          token: string
        }
        Update: {
          created_at?: string | null
          expires_at?: string
          id?: string
          staff_user_id?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "sessions_staff_user_id_fkey"
            columns: ["staff_user_id"]
            isOneToOne: false
            referencedRelation: "staff_users"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_users: {
        Row: {
          created_at: string | null
          full_name: string
          id: string
          is_active: boolean | null
          password_hash: string
          role: string | null
          updated_at: string | null
          username: string
        }
        Insert: {
          created_at?: string | null
          full_name: string
          id?: string
          is_active?: boolean | null
          password_hash: string
          role?: string | null
          updated_at?: string | null
          username: string
        }
        Update: {
          created_at?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          password_hash?: string
          role?: string | null
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_login_rate_limit: {
        Args: { p_ip_address: string }
        Returns: number
      }
      check_registration_status: {
        Args: { p_email: string }
        Returns: {
          approved_at: string
          approved_by: string
          first_name: string
          last_name: string
          status: string
          submitted_at: string
        }[]
      }
      get_active_announcements: {
        Args: never
        Returns: {
          content: string
          content_tl: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          title: string
          title_tl: string | null
          type: string | null
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "announcements"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_all_announcements_for_staff: {
        Args: never
        Returns: {
          content: string
          content_tl: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          title: string
          title_tl: string | null
          type: string | null
          updated_at: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "announcements"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_all_certificate_requests_for_staff: {
        Args: { p_status_filter?: string }
        Returns: {
          birth_date: string | null
          certificate_type: string
          contact_number: string | null
          control_number: string
          created_at: string | null
          email: string | null
          full_name: string
          household_number: string | null
          id: string
          notes: string | null
          preferred_pickup_date: string | null
          priority: string | null
          processed_by: string | null
          purpose: string | null
          rejection_reason: string | null
          resident_id: string | null
          status: string | null
          updated_at: string | null
          uploaded_id_url: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "certificate_requests"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_all_residents_for_staff: {
        Args: never
        Returns: {
          birth_date: string
          civil_status: string
          contact_number: string
          created_at: string
          dialects_spoken: Json
          education_attainment: string
          email: string
          employment_category: string
          employment_status: string
          ethnic_group: string
          first_name: string
          gender: string
          household_id: string
          id: string
          is_head_of_household: boolean
          last_name: string
          livelihood_training: string
          middle_name: string
          monthly_income_cash: string
          monthly_income_kind: string
          occupation: string
          place_of_origin: string
          privacy_consent_given_at: string
          relation_to_head: string
          religion: string
          schooling_status: string
          suffix: string
          updated_at: string
          user_id: string
        }[]
      }
      get_deleted_residents_for_staff: {
        Args: never
        Returns: {
          contact_number: string
          deleted_at: string
          deleted_by: string
          email: string
          first_name: string
          id: string
          last_name: string
          middle_name: string
          suffix: string
        }[]
      }
      get_pending_registration_count: { Args: never; Returns: number }
      get_pending_registrations: {
        Args: never
        Returns: {
          approval_status: string
          birth_date: string
          contact_number: string
          created_at: string
          email: string
          first_name: string
          id: string
          last_name: string
          middle_name: string
          place_of_origin: string
        }[]
      }
      get_pending_requests: {
        Args: never
        Returns: {
          birth_date: string | null
          certificate_type: string
          contact_number: string | null
          control_number: string
          created_at: string | null
          email: string | null
          full_name: string
          household_number: string | null
          id: string
          notes: string | null
          preferred_pickup_date: string | null
          priority: string | null
          processed_by: string | null
          purpose: string | null
          rejection_reason: string | null
          resident_id: string | null
          status: string | null
          updated_at: string | null
          uploaded_id_url: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "certificate_requests"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_resident_count: { Args: never; Returns: number }
      get_resident_names_by_user_ids: {
        Args: { p_user_ids: string[] }
        Returns: {
          full_name: string
          user_id: string
        }[]
      }
      get_residents_for_messaging: {
        Args: never
        Returns: {
          email: string
          full_name: string
          user_id: string
        }[]
      }
      get_staff_for_messaging: {
        Args: never
        Returns: {
          full_name: string
          id: string
          role: string
        }[]
      }
      get_staff_messages: {
        Args: { p_staff_id: string }
        Returns: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          parent_message_id: string
          recipient_id: string
          recipient_type: string
          sender_id: string
          sender_type: string
          subject: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      record_login_attempt: {
        Args: { p_ip_address: string; p_success: boolean; p_username: string }
        Returns: undefined
      }
      register_new_resident: {
        Args: {
          p_address: string
          p_birth_date: string
          p_contact_number: string
          p_email: string
          p_first_name: string
          p_last_name: string
          p_middle_name: string
        }
        Returns: string
      }
      staff_approve_resident: {
        Args: { p_approved_by: string; p_resident_id: string }
        Returns: undefined
      }
      staff_create_announcement: {
        Args: {
          p_content: string
          p_content_tl?: string
          p_created_by?: string
          p_title: string
          p_title_tl?: string
          p_type?: string
        }
        Returns: {
          content: string
          content_tl: string | null
          created_at: string | null
          created_by: string | null
          id: string
          is_active: boolean | null
          title: string
          title_tl: string | null
          type: string | null
          updated_at: string | null
        }
        SetofOptions: {
          from: "*"
          to: "announcements"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      staff_delete_announcement: { Args: { p_id: string }; Returns: undefined }
      staff_delete_resident: {
        Args: { p_resident_id: string }
        Returns: undefined
      }
      staff_mark_message_read: {
        Args: { p_message_id: string }
        Returns: undefined
      }
      staff_reject_resident: {
        Args: {
          p_rejected_by: string
          p_rejection_reason: string
          p_resident_id: string
        }
        Returns: undefined
      }
      staff_restore_resident: {
        Args: { p_resident_id: string }
        Returns: undefined
      }
      staff_send_new_message: {
        Args: {
          p_content: string
          p_recipient_user_id: string
          p_staff_id: string
          p_subject: string
        }
        Returns: string
      }
      staff_send_reply: {
        Args: {
          p_content: string
          p_parent_message_id: string
          p_recipient_id: string
          p_staff_id: string
          p_subject: string
        }
        Returns: string
      }
      staff_update_announcement: {
        Args: {
          p_content?: string
          p_content_tl?: string
          p_id: string
          p_is_active?: boolean
          p_title?: string
          p_title_tl?: string
          p_type?: string
        }
        Returns: undefined
      }
      staff_update_request_status: {
        Args: {
          p_notes?: string
          p_processed_by: string
          p_request_id: string
          p_status: string
        }
        Returns: {
          birth_date: string | null
          certificate_type: string
          contact_number: string | null
          control_number: string
          created_at: string | null
          email: string | null
          full_name: string
          household_number: string | null
          id: string
          notes: string | null
          preferred_pickup_date: string | null
          priority: string | null
          processed_by: string | null
          purpose: string | null
          rejection_reason: string | null
          resident_id: string | null
          status: string | null
          updated_at: string | null
          uploaded_id_url: string | null
        }
        SetofOptions: {
          from: "*"
          to: "certificate_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      track_certificate_request: {
        Args: { p_control_number: string }
        Returns: {
          certificate_type: string
          control_number: string
          created_at: string
          full_name: string
          id: string
          notes: string
          purpose: string
          rejection_reason: string
          status: string
          updated_at: string
        }[]
      }
      validate_session: {
        Args: { session_token: string }
        Returns: {
          full_name: string
          role: string
          staff_user_id: string
          username: string
        }[]
      }
      verify_resident_and_get_id: {
        Args: {
          p_birth_date: string
          p_full_name: string
          p_household_number: string
        }
        Returns: string
      }
      verify_resident_exists: {
        Args: {
          p_birth_date: string
          p_full_name: string
          p_household_number: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "staff" | "user"
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
      app_role: ["admin", "staff", "user"],
    },
  },
} as const
