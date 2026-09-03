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
      _migration_contact_map: {
        Row: {
          customer_id: string
          old_contact_id: string
        }
        Insert: {
          customer_id: string
          old_contact_id: string
        }
        Update: {
          customer_id?: string
          old_contact_id?: string
        }
        Relationships: []
      }
      ai_usage_log: {
        Row: {
          cost_usd: number
          created_at: string
          id: string
          input_tokens: number
          organization_id: string
          output_tokens: number
        }
        Insert: {
          cost_usd: number
          created_at?: string
          id?: string
          input_tokens: number
          organization_id: string
          output_tokens: number
        }
        Update: {
          cost_usd?: number
          created_at?: string
          id?: string
          input_tokens?: number
          organization_id?: string
          output_tokens?: number
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_reminders: {
        Row: {
          appointment_id: string
          created_at: string
          customer_name: string | null
          customer_phone: string
          error_message: string | null
          id: string
          organization_id: string
          reminder_type: string
          scheduled_at: string
          sent_at: string | null
          status: string
          updated_at: string
          whapify_flow_id: string | null
          whapify_response: Json | null
        }
        Insert: {
          appointment_id: string
          created_at?: string
          customer_name?: string | null
          customer_phone: string
          error_message?: string | null
          id?: string
          organization_id: string
          reminder_type: string
          scheduled_at: string
          sent_at?: string | null
          status?: string
          updated_at?: string
          whapify_flow_id?: string | null
          whapify_response?: Json | null
        }
        Update: {
          appointment_id?: string
          created_at?: string
          customer_name?: string | null
          customer_phone?: string
          error_message?: string | null
          id?: string
          organization_id?: string
          reminder_type?: string
          scheduled_at?: string
          sent_at?: string | null
          status?: string
          updated_at?: string
          whapify_flow_id?: string | null
          whapify_response?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_reminders_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_reminders_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      appointments: {
        Row: {
          apple_event_id: string | null
          appointment_date: string
          barber_id: string
          cancellation_reason: string | null
          created_at: string
          customer_id: string
          end_time: string
          google_event_id: string | null
          id: string
          notes: string | null
          organization_id: string
          service_id: string
          source: string | null
          start_time: string
          status: string
          updated_at: string
        }
        Insert: {
          apple_event_id?: string | null
          appointment_date: string
          barber_id: string
          cancellation_reason?: string | null
          created_at?: string
          customer_id: string
          end_time: string
          google_event_id?: string | null
          id?: string
          notes?: string | null
          organization_id: string
          service_id: string
          source?: string | null
          start_time: string
          status?: string
          updated_at?: string
        }
        Update: {
          apple_event_id?: string | null
          appointment_date?: string
          barber_id?: string
          cancellation_reason?: string | null
          created_at?: string
          customer_id?: string
          end_time?: string
          google_event_id?: string | null
          id?: string
          notes?: string | null
          organization_id?: string
          service_id?: string
          source?: string | null
          start_time?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
        ]
      }
      barber_schedules: {
        Row: {
          barber_id: string
          created_at: string
          day_of_week: number
          end_time: string
          id: string
          is_available: boolean
          organization_id: string
          start_time: string
        }
        Insert: {
          barber_id: string
          created_at?: string
          day_of_week: number
          end_time: string
          id?: string
          is_available?: boolean
          organization_id: string
          start_time: string
        }
        Update: {
          barber_id?: string
          created_at?: string
          day_of_week?: number
          end_time?: string
          id?: string
          is_available?: boolean
          organization_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "barber_schedules_barber_id_fkey"
            columns: ["barber_id"]
            isOneToOne: false
            referencedRelation: "barbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "barber_schedules_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      barbers: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          phone: string | null
          specialty: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          phone?: string | null
          specialty?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          phone?: string | null
          specialty?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "barbers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      calendar_integrations: {
        Row: {
          access_token: string | null
          connected_email: string | null
          created_at: string
          google_calendar_id: string
          id: string
          is_active: boolean
          organization_id: string
          provider: string
          refresh_token: string
          token_expires_at: string | null
          updated_at: string
        }
        Insert: {
          access_token?: string | null
          connected_email?: string | null
          created_at?: string
          google_calendar_id?: string
          id?: string
          is_active?: boolean
          organization_id: string
          provider?: string
          refresh_token: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string | null
          connected_email?: string | null
          created_at?: string
          google_calendar_id?: string
          id?: string
          is_active?: boolean
          organization_id?: string
          provider?: string
          refresh_token?: string
          token_expires_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "calendar_integrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_campaign_batches: {
        Row: {
          batch_index: number | null
          campaign_id: string | null
          contact_count: number | null
          created_at: string
          finished_at: string | null
          id: string
          organization_id: string
          started_at: string | null
          status: string | null
        }
        Insert: {
          batch_index?: number | null
          campaign_id?: string | null
          contact_count?: number | null
          created_at?: string
          finished_at?: string | null
          id: string
          organization_id: string
          started_at?: string | null
          status?: string | null
        }
        Update: {
          batch_index?: number | null
          campaign_id?: string | null
          contact_count?: number | null
          created_at?: string
          finished_at?: string | null
          id?: string
          organization_id?: string
          started_at?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_campaign_batches_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "chat_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_campaign_batches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_campaign_recipients: {
        Row: {
          campaign_id: string | null
          created_at: string
          customer_id: string | null
          id: string
          message_id: string | null
          organization_id: string
          phone_number_snapshot: string | null
          skip_reason: string | null
          status: string | null
          updated_at: string
          variables: Json | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          customer_id?: string | null
          id: string
          message_id?: string | null
          organization_id: string
          phone_number_snapshot?: string | null
          skip_reason?: string | null
          status?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          message_id?: string | null
          organization_id?: string
          phone_number_snapshot?: string | null
          skip_reason?: string | null
          status?: string | null
          updated_at?: string
          variables?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_campaign_recipients_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "chat_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_campaign_recipients_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_campaign_recipients_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_campaign_recipients_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_campaigns: {
        Row: {
          audience_filter: Json | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          id: string
          name: string
          organization_id: string
          phone_number_id: string | null
          scheduled_at: string | null
          started_at: string | null
          stats: Json | null
          status: string | null
          template_id: string | null
          updated_at: string
          variable_mapping: Json | null
        }
        Insert: {
          audience_filter?: Json | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id: string
          name: string
          organization_id: string
          phone_number_id?: string | null
          scheduled_at?: string | null
          started_at?: string | null
          stats?: Json | null
          status?: string | null
          template_id?: string | null
          updated_at?: string
          variable_mapping?: Json | null
        }
        Update: {
          audience_filter?: Json | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          name?: string
          organization_id?: string
          phone_number_id?: string | null
          scheduled_at?: string | null
          started_at?: string | null
          stats?: Json | null
          status?: string | null
          template_id?: string | null
          updated_at?: string
          variable_mapping?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_campaigns_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_campaigns_phone_number_id_fkey"
            columns: ["phone_number_id"]
            isOneToOne: false
            referencedRelation: "chat_phone_numbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_campaigns_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "chat_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_contact_imports: {
        Row: {
          created_at: string
          error_count: number | null
          error_report_path: string | null
          file_path: string | null
          id: string
          organization_id: string
          status: string | null
          success_count: number | null
          total_rows: number | null
          updated_at: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          error_count?: number | null
          error_report_path?: string | null
          file_path?: string | null
          id: string
          organization_id: string
          status?: string | null
          success_count?: number | null
          total_rows?: number | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          error_count?: number | null
          error_report_path?: string | null
          file_path?: string | null
          id?: string
          organization_id?: string
          status?: string | null
          success_count?: number | null
          total_rows?: number | null
          updated_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_contact_imports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          assigned_to: string | null
          created_at: string
          customer_id: string | null
          id: string
          last_inbound_at: string | null
          last_outbound_at: string | null
          organization_id: string
          phone_number_id: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          customer_id?: string | null
          id: string
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          organization_id: string
          phone_number_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          last_inbound_at?: string | null
          last_outbound_at?: string | null
          organization_id?: string
          phone_number_id?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_conversations_phone_number_id_fkey"
            columns: ["phone_number_id"]
            isOneToOne: false
            referencedRelation: "chat_phone_numbers"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_custom_field_definitions: {
        Row: {
          created_at: string
          field_type: string | null
          id: string
          key: string
          label: string | null
          options: Json | null
          organization_id: string
        }
        Insert: {
          created_at?: string
          field_type?: string | null
          id: string
          key: string
          label?: string | null
          options?: Json | null
          organization_id: string
        }
        Update: {
          created_at?: string
          field_type?: string | null
          id?: string
          key?: string
          label?: string | null
          options?: Json | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_custom_field_definitions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_flow_branches: {
        Row: {
          created_at: string
          from_step_id: string | null
          id: string
          match_type: string | null
          match_value: string | null
          organization_id: string
          priority: number | null
          to_step_id: string | null
        }
        Insert: {
          created_at?: string
          from_step_id?: string | null
          id: string
          match_type?: string | null
          match_value?: string | null
          organization_id: string
          priority?: number | null
          to_step_id?: string | null
        }
        Update: {
          created_at?: string
          from_step_id?: string | null
          id?: string
          match_type?: string | null
          match_value?: string | null
          organization_id?: string
          priority?: number | null
          to_step_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_flow_branches_from_step_id_fkey"
            columns: ["from_step_id"]
            isOneToOne: false
            referencedRelation: "chat_flow_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_flow_branches_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_flow_branches_to_step_id_fkey"
            columns: ["to_step_id"]
            isOneToOne: false
            referencedRelation: "chat_flow_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_flow_runs: {
        Row: {
          completed_at: string | null
          conversation_id: string | null
          current_step_id: string | null
          customer_id: string | null
          flow_id: string | null
          id: string
          organization_id: string
          started_at: string | null
          status: string | null
          trigger_wamid: string | null
        }
        Insert: {
          completed_at?: string | null
          conversation_id?: string | null
          current_step_id?: string | null
          customer_id?: string | null
          flow_id?: string | null
          id: string
          organization_id: string
          started_at?: string | null
          status?: string | null
          trigger_wamid?: string | null
        }
        Update: {
          completed_at?: string | null
          conversation_id?: string | null
          current_step_id?: string | null
          customer_id?: string | null
          flow_id?: string | null
          id?: string
          organization_id?: string
          started_at?: string | null
          status?: string | null
          trigger_wamid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_flow_runs_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_flow_runs_current_step_id_fkey"
            columns: ["current_step_id"]
            isOneToOne: false
            referencedRelation: "chat_flow_steps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_flow_runs_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_flow_runs_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "chat_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_flow_runs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_flow_steps: {
        Row: {
          content_type: string | null
          created_at: string
          flow_id: string | null
          id: string
          media_mime_type: string | null
          media_path: string | null
          organization_id: string
          step_order: number | null
          text_body: string | null
        }
        Insert: {
          content_type?: string | null
          created_at?: string
          flow_id?: string | null
          id: string
          media_mime_type?: string | null
          media_path?: string | null
          organization_id: string
          step_order?: number | null
          text_body?: string | null
        }
        Update: {
          content_type?: string | null
          created_at?: string
          flow_id?: string | null
          id?: string
          media_mime_type?: string | null
          media_path?: string | null
          organization_id?: string
          step_order?: number | null
          text_body?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_flow_steps_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "chat_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_flow_steps_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_flows: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          template_id: string | null
          updated_at: string
          waba_account_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id: string
          is_active?: boolean
          name: string
          organization_id: string
          template_id?: string | null
          updated_at?: string
          waba_account_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          template_id?: string | null
          updated_at?: string
          waba_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_flows_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_flows_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "chat_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_flows_waba_account_id_fkey"
            columns: ["waba_account_id"]
            isOneToOne: false
            referencedRelation: "chat_waba_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_hotmart_webhook_events: {
        Row: {
          event: string | null
          hotmart_webhook_id: string | null
          id: string
          message_id: string | null
          organization_id: string
          payload: Json | null
          processed_at: string | null
          processing_error: string | null
          received_at: string | null
        }
        Insert: {
          event?: string | null
          hotmart_webhook_id?: string | null
          id: string
          message_id?: string | null
          organization_id: string
          payload?: Json | null
          processed_at?: string | null
          processing_error?: string | null
          received_at?: string | null
        }
        Update: {
          event?: string | null
          hotmart_webhook_id?: string | null
          id?: string
          message_id?: string | null
          organization_id?: string
          payload?: Json | null
          processed_at?: string | null
          processing_error?: string | null
          received_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_hotmart_webhook_events_hotmart_webhook_id_fkey"
            columns: ["hotmart_webhook_id"]
            isOneToOne: false
            referencedRelation: "chat_hotmart_webhooks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_hotmart_webhook_events_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_hotmart_webhook_events_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_hotmart_webhooks: {
        Row: {
          created_at: string
          created_by: string | null
          event: string | null
          id: string
          is_active: boolean
          name: string | null
          organization_id: string
          phone_number_id: string | null
          template_id: string | null
          updated_at: string
          variable_mapping: Json | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          event?: string | null
          id: string
          is_active?: boolean
          name?: string | null
          organization_id: string
          phone_number_id?: string | null
          template_id?: string | null
          updated_at?: string
          variable_mapping?: Json | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          event?: string | null
          id?: string
          is_active?: boolean
          name?: string | null
          organization_id?: string
          phone_number_id?: string | null
          template_id?: string | null
          updated_at?: string
          variable_mapping?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_hotmart_webhooks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_hotmart_webhooks_phone_number_id_fkey"
            columns: ["phone_number_id"]
            isOneToOne: false
            referencedRelation: "chat_phone_numbers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_hotmart_webhooks_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "chat_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          content: Json | null
          conversation_id: string | null
          created_at: string
          direction: string | null
          id: string
          message_type: string | null
          organization_id: string
          sender_id: string | null
          sender_type: string | null
          status: string | null
          wamid: string | null
        }
        Insert: {
          content?: Json | null
          conversation_id?: string | null
          created_at?: string
          direction?: string | null
          id: string
          message_type?: string | null
          organization_id: string
          sender_id?: string | null
          sender_type?: string | null
          status?: string | null
          wamid?: string | null
        }
        Update: {
          content?: Json | null
          conversation_id?: string | null
          created_at?: string
          direction?: string | null
          id?: string
          message_type?: string | null
          organization_id?: string
          sender_id?: string | null
          sender_type?: string | null
          status?: string | null
          wamid?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_phone_numbers: {
        Row: {
          created_at: string
          display_phone_number: string | null
          id: string
          is_active: boolean
          label: string | null
          messaging_tier: string | null
          organization_id: string
          phone_number_id: string
          quality_rating: string | null
          waba_account_id: string | null
        }
        Insert: {
          created_at?: string
          display_phone_number?: string | null
          id: string
          is_active?: boolean
          label?: string | null
          messaging_tier?: string | null
          organization_id: string
          phone_number_id: string
          quality_rating?: string | null
          waba_account_id?: string | null
        }
        Update: {
          created_at?: string
          display_phone_number?: string | null
          id?: string
          is_active?: boolean
          label?: string | null
          messaging_tier?: string | null
          organization_id?: string
          phone_number_id?: string
          quality_rating?: string | null
          waba_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_phone_numbers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_phone_numbers_waba_account_id_fkey"
            columns: ["waba_account_id"]
            isOneToOne: false
            referencedRelation: "chat_waba_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_templates: {
        Row: {
          category: string | null
          components: Json | null
          created_at: string
          id: string
          language: string | null
          last_synced_at: string | null
          meta_template_id: string | null
          name: string
          organization_id: string
          status: string | null
          waba_account_id: string | null
        }
        Insert: {
          category?: string | null
          components?: Json | null
          created_at?: string
          id: string
          language?: string | null
          last_synced_at?: string | null
          meta_template_id?: string | null
          name: string
          organization_id: string
          status?: string | null
          waba_account_id?: string | null
        }
        Update: {
          category?: string | null
          components?: Json | null
          created_at?: string
          id?: string
          language?: string | null
          last_synced_at?: string | null
          meta_template_id?: string | null
          name?: string
          organization_id?: string
          status?: string | null
          waba_account_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_templates_waba_account_id_fkey"
            columns: ["waba_account_id"]
            isOneToOne: false
            referencedRelation: "chat_waba_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_waba_accounts: {
        Row: {
          access_token_encrypted: string | null
          app_secret_ref: string | null
          business_name: string | null
          created_at: string
          id: string
          is_active: boolean
          organization_id: string
          updated_at: string
          waba_id: string
        }
        Insert: {
          access_token_encrypted?: string | null
          app_secret_ref?: string | null
          business_name?: string | null
          created_at?: string
          id: string
          is_active?: boolean
          organization_id: string
          updated_at?: string
          waba_id: string
        }
        Update: {
          access_token_encrypted?: string | null
          app_secret_ref?: string | null
          business_name?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          organization_id?: string
          updated_at?: string
          waba_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_waba_accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_notes: {
        Row: {
          content: string
          created_at: string
          customer_id: string
          id: string
          metadata: Json | null
          note_type: string
          occurred_at: string
          organization_id: string
          source: string
        }
        Insert: {
          content: string
          created_at?: string
          customer_id: string
          id?: string
          metadata?: Json | null
          note_type?: string
          occurred_at?: string
          organization_id: string
          source?: string
        }
        Update: {
          content?: string
          created_at?: string
          customer_id?: string
          id?: string
          metadata?: Json | null
          note_type?: string
          occurred_at?: string
          organization_id?: string
          source?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_notes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_notes_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_payments: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          method: string
          note: string | null
          organization_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          method?: string
          note?: string | null
          organization_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          method?: string
          note?: string | null
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_payments_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_payments_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_tags: {
        Row: {
          created_at: string
          customer_id: string
          tag_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          tag_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_tags_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          assigned_to: string | null
          balance: number
          balance_due_date: string | null
          consent_source: string | null
          consent_status: string | null
          created_at: string
          email: string | null
          id: string
          identification_number: string | null
          name: string
          notes: string | null
          organization_id: string
          phone: string
          pipeline_stage_id: string | null
          source: string | null
          updated_at: string
          wa_id: string | null
          whatsapp_id: string | null
        }
        Insert: {
          assigned_to?: string | null
          balance?: number
          balance_due_date?: string | null
          consent_source?: string | null
          consent_status?: string | null
          created_at?: string
          email?: string | null
          id?: string
          identification_number?: string | null
          name: string
          notes?: string | null
          organization_id: string
          phone: string
          pipeline_stage_id?: string | null
          source?: string | null
          updated_at?: string
          wa_id?: string | null
          whatsapp_id?: string | null
        }
        Update: {
          assigned_to?: string | null
          balance?: number
          balance_due_date?: string | null
          consent_source?: string | null
          consent_status?: string | null
          created_at?: string
          email?: string | null
          id?: string
          identification_number?: string | null
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string
          pipeline_stage_id?: string | null
          source?: string | null
          updated_at?: string
          wa_id?: string | null
          whatsapp_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_pipeline_stage_id_fkey"
            columns: ["pipeline_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          description: string
          expense_date: string
          id: string
          import_id: string | null
          organization_id: string
          payment_method: string | null
          source: string
          type: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by?: string | null
          description: string
          expense_date: string
          id?: string
          import_id?: string | null
          organization_id: string
          payment_method?: string | null
          source?: string
          type?: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          expense_date?: string
          id?: string
          import_id?: string | null
          organization_id?: string
          payment_method?: string | null
          source?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_imports: {
        Row: {
          created_at: string
          created_by: string | null
          error_message: string | null
          file_name: string | null
          id: string
          import_type: string
          organization_id: string
          rows_failed: number
          rows_imported: number
          status: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          file_name?: string | null
          id?: string
          import_type: string
          organization_id: string
          rows_failed?: number
          rows_imported?: number
          status?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          error_message?: string | null
          file_name?: string | null
          id?: string
          import_type?: string
          organization_id?: string
          rows_failed?: number
          rows_imported?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_imports_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_flows: {
        Row: {
          created_at: string
          custom_message: string | null
          id: string
          is_active: boolean
          name: string
          organization_id: string
          template_id: string | null
          trigger_minutes: number
          trigger_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_message?: string | null
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          template_id?: string | null
          trigger_minutes: number
          trigger_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_message?: string | null
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          template_id?: string | null
          trigger_minutes?: number
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_flows_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_flows_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          cancellations: boolean
          created_at: string
          daily_summary: boolean
          id: string
          new_appointments: boolean
          organization_id: string
          reminders: boolean
          updated_at: string
          whatsapp_messages: boolean
        }
        Insert: {
          cancellations?: boolean
          created_at?: string
          daily_summary?: boolean
          id?: string
          new_appointments?: boolean
          organization_id: string
          reminders?: boolean
          updated_at?: string
          whatsapp_messages?: boolean
        }
        Update: {
          cancellations?: boolean
          created_at?: string
          daily_summary?: boolean
          id?: string
          new_appointments?: boolean
          organization_id?: string
          reminders?: boolean
          updated_at?: string
          whatsapp_messages?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "notification_preferences_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          appointment_id: string | null
          created_at: string
          id: string
          message: string
          organization_id: string
          read: boolean
          title: string
          type: string
        }
        Insert: {
          appointment_id?: string | null
          created_at?: string
          id?: string
          message: string
          organization_id: string
          read?: boolean
          title: string
          type: string
        }
        Update: {
          appointment_id?: string | null
          created_at?: string
          id?: string
          message?: string
          organization_id?: string
          read?: boolean
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          ai_monthly_cap_usd: number
          created_at: string
          created_by: string | null
          id: string
          mcp_token: string
          name: string
          timezone: string
          updated_at: string
        }
        Insert: {
          ai_monthly_cap_usd?: number
          created_at?: string
          created_by?: string | null
          id?: string
          mcp_token?: string
          name?: string
          timezone?: string
          updated_at?: string
        }
        Update: {
          ai_monthly_cap_usd?: number
          created_at?: string
          created_by?: string | null
          id?: string
          mcp_token?: string
          name?: string
          timezone?: string
          updated_at?: string
        }
        Relationships: []
      }
      pipeline_stages: {
        Row: {
          created_at: string
          id: string
          name: string
          organization_id: string
          position: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          organization_id: string
          position?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_admins: {
        Row: {
          created_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      reminder_settings: {
        Row: {
          active: boolean
          channel: string
          created_at: string
          id: string
          minutes_before: number
          organization_id: string
          reminder_type: string
          updated_at: string
          whapify_flow_id: string | null
        }
        Insert: {
          active?: boolean
          channel?: string
          created_at?: string
          id?: string
          minutes_before: number
          organization_id: string
          reminder_type: string
          updated_at?: string
          whapify_flow_id?: string | null
        }
        Update: {
          active?: boolean
          channel?: string
          created_at?: string
          id?: string
          minutes_before?: number
          organization_id?: string
          reminder_type?: string
          updated_at?: string
          whapify_flow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reminder_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_entries: {
        Row: {
          amount: number
          client_name: string
          created_at: string
          created_by: string | null
          id: string
          import_id: string | null
          organization_id: string
          payment_method: string | null
          sale_date: string
          sale_time: string | null
          service_name: string
          source: string
          status: string
          stylist_name: string | null
        }
        Insert: {
          amount: number
          client_name: string
          created_at?: string
          created_by?: string | null
          id?: string
          import_id?: string | null
          organization_id: string
          payment_method?: string | null
          sale_date: string
          sale_time?: string | null
          service_name: string
          source?: string
          status?: string
          stylist_name?: string | null
        }
        Update: {
          amount?: number
          client_name?: string
          created_at?: string
          created_by?: string | null
          id?: string
          import_id?: string | null
          organization_id?: string
          payment_method?: string | null
          sale_date?: string
          sale_time?: string | null
          service_name?: string
          source?: string
          status?: string
          stylist_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_entries_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_settings: {
        Row: {
          created_at: string
          day_end: string
          day_start: string
          id: string
          organization_id: string
          singleton: boolean
          slot_minutes: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_end?: string
          day_start?: string
          id?: string
          organization_id: string
          singleton?: boolean
          slot_minutes?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_end?: string
          day_start?: string
          id?: string
          organization_id?: string
          singleton?: boolean
          slot_minutes?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      sent_notifications: {
        Row: {
          appointment_id: string
          flow_id: string
          id: string
          organization_id: string
          sent_at: string
          status: string | null
          whatsapp_message_id: string | null
        }
        Insert: {
          appointment_id: string
          flow_id: string
          id?: string
          organization_id: string
          sent_at?: string
          status?: string | null
          whatsapp_message_id?: string | null
        }
        Update: {
          appointment_id?: string
          flow_id?: string
          id?: string
          organization_id?: string
          sent_at?: string
          status?: string | null
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sent_notifications_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sent_notifications_flow_id_fkey"
            columns: ["flow_id"]
            isOneToOne: false
            referencedRelation: "notification_flows"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sent_notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          benefits: string | null
          created_at: string
          description: string | null
          duration_minutes: number
          id: string
          is_active: boolean
          name: string
          organization_id: string
          price: number
        }
        Insert: {
          benefits?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name: string
          organization_id: string
          price?: number
        }
        Update: {
          benefits?: string | null
          created_at?: string
          description?: string | null
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name?: string
          organization_id?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "services_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
          organization_id: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
          organization_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
          organization_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          description: string | null
          due_at: string | null
          id: string
          organization_id: string
          status: string
          title: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          organization_id: string
          status?: string
          title: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          description?: string | null
          due_at?: string | null
          id?: string
          organization_id?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organization_id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organization_id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      whapify_flows: {
        Row: {
          created_at: string
          flow_id: string
          flow_name: string
          id: string
          is_active: boolean
          organization_id: string
          raw_data: Json | null
          synced_at: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          flow_id: string
          flow_name: string
          id?: string
          is_active?: boolean
          organization_id: string
          raw_data?: Json | null
          synced_at?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          flow_id?: string
          flow_name?: string
          id?: string
          is_active?: boolean
          organization_id?: string
          raw_data?: Json | null
          synced_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whapify_flows_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      whapify_settings: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          last_synced_at: string | null
          last_validated_at: string | null
          organization_id: string
          updated_at: string
          whapify_token: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          last_validated_at?: string | null
          organization_id: string
          updated_at?: string
          whapify_token?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_synced_at?: string | null
          last_validated_at?: string | null
          organization_id?: string
          updated_at?: string
          whapify_token?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whapify_settings_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: true
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_conversations: {
        Row: {
          context: Json | null
          created_at: string
          customer_id: string | null
          id: string
          last_message: string | null
          last_message_at: string | null
          organization_id: string
          phone_number: string
          status: string
          updated_at: string
        }
        Insert: {
          context?: Json | null
          created_at?: string
          customer_id?: string | null
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          organization_id: string
          phone_number: string
          status?: string
          updated_at?: string
        }
        Update: {
          context?: Json | null
          created_at?: string
          customer_id?: string | null
          id?: string
          last_message?: string | null
          last_message_at?: string | null
          organization_id?: string
          phone_number?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_conversations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_conversations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          direction: string
          id: string
          message_type: string
          organization_id: string
          status: string | null
          whatsapp_message_id: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          direction: string
          id?: string
          message_type?: string
          organization_id: string
          status?: string | null
          whatsapp_message_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          direction?: string
          id?: string
          message_type?: string
          organization_id?: string
          status?: string | null
          whatsapp_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "whatsapp_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "whatsapp_messages_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_templates: {
        Row: {
          body_text: string
          buttons: Json | null
          category: string
          created_at: string
          footer_text: string | null
          header_content: string | null
          header_type: string | null
          id: string
          language: string
          meta_rejection_reason: string | null
          meta_status: string | null
          meta_template_id: string | null
          name: string
          organization_id: string
          updated_at: string
        }
        Insert: {
          body_text: string
          buttons?: Json | null
          category?: string
          created_at?: string
          footer_text?: string | null
          header_content?: string | null
          header_type?: string | null
          id?: string
          language?: string
          meta_rejection_reason?: string | null
          meta_status?: string | null
          meta_template_id?: string | null
          name: string
          organization_id: string
          updated_at?: string
        }
        Update: {
          body_text?: string
          buttons?: Json | null
          category?: string
          created_at?: string
          footer_text?: string | null
          header_content?: string | null
          header_type?: string | null
          id?: string
          language?: string
          meta_rejection_reason?: string | null
          meta_status?: string | null
          meta_template_id?: string | null
          name?: string
          organization_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "whatsapp_templates_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_org_id: { Args: never; Returns: string }
      current_role_name: {
        Args: never
        Returns: Database["public"]["Enums"]["app_role"]
      }
      generate_appointment_reminders: {
        Args: { _appointment_id: string }
        Returns: undefined
      }
      get_platform_organizations: {
        Args: never
        Returns: {
          admin_email: string
          admin_name: string
          ai_monthly_cap_usd: number
          ai_usage_this_month_usd: number
          appointments_count: number
          appointments_last_30d: number
          created_at: string
          customers_count: number
          is_active: boolean
          organization_id: string
          organization_name: string
          sales_total: number
          users_count: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_authenticated_staff: { Args: never; Returns: boolean }
      is_platform_admin: { Args: never; Returns: boolean }
      register_customer_payment: {
        Args: {
          p_amount: number
          p_customer_id: string
          p_method: string
          p_note?: string
        }
        Returns: {
          amount: number
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          method: string
          note: string | null
          organization_id: string
        }
        SetofOptions: {
          from: "*"
          to: "customer_payments"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_organization_ai_cap: {
        Args: { new_cap: number; org_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "staff" | "barber"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "staff", "barber"],
    },
  },
} as const
