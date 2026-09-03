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
      campaigns: {
        Row: {
          angle: string
          asset_urls: Json
          avoid: string
          brand_id: string
          brand_name: string
          budget: number
          checklist: Json
          closed_at: string | null
          created_at: string
          deadline: string | null
          disclosure: string
          extended_days: number
          funded_amount: number
          hashtags: string
          id: string
          links: Json
          must_include: string
          rate_per_1k: number
          socials: Json
          spent_amount: number
          started_at: string | null
          status: string
          title: string
          topic: string
          updated_at: string
        }
        Insert: {
          angle?: string
          asset_urls?: Json
          avoid?: string
          brand_id: string
          brand_name?: string
          budget?: number
          checklist?: Json
          closed_at?: string | null
          created_at?: string
          deadline?: string | null
          disclosure?: string
          extended_days?: number
          funded_amount?: number
          hashtags?: string
          id?: string
          links?: Json
          must_include?: string
          rate_per_1k?: number
          socials?: Json
          spent_amount?: number
          started_at?: string | null
          status?: string
          title: string
          topic?: string
          updated_at?: string
        }
        Update: {
          angle?: string
          asset_urls?: Json
          avoid?: string
          brand_id?: string
          brand_name?: string
          budget?: number
          checklist?: Json
          closed_at?: string | null
          created_at?: string
          deadline?: string | null
          disclosure?: string
          extended_days?: number
          funded_amount?: number
          hashtags?: string
          id?: string
          links?: Json
          must_include?: string
          rate_per_1k?: number
          socials?: Json
          spent_amount?: number
          started_at?: string | null
          status?: string
          title?: string
          topic?: string
          updated_at?: string
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          company: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          tax_id: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          tax_id?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          company?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          tax_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          brand_id: string
          brand_name: string
          campaign_id: string | null
          created_at: string
          creator_id: string
          creator_name: string
          id: string
          last_message_at: string
        }
        Insert: {
          brand_id: string
          brand_name?: string
          campaign_id?: string | null
          created_at?: string
          creator_id: string
          creator_name?: string
          id?: string
          last_message_at?: string
        }
        Update: {
          brand_id?: string
          brand_name?: string
          campaign_id?: string | null
          created_at?: string
          creator_id?: string
          creator_name?: string
          id?: string
          last_message_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      earnings: {
        Row: {
          amount: number
          campaign_id: string
          created_at: string
          creator_id: string
          id: string
          submission_id: string
          views_delta: number
        }
        Insert: {
          amount?: number
          campaign_id: string
          created_at?: string
          creator_id: string
          id?: string
          submission_id: string
          views_delta?: number
        }
        Update: {
          amount?: number
          campaign_id?: string
          created_at?: string
          creator_id?: string
          id?: string
          submission_id?: string
          views_delta?: number
        }
        Relationships: [
          {
            foreignKeyName: "earnings_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "earnings_submission_id_fkey"
            columns: ["submission_id"]
            isOneToOne: false
            referencedRelation: "submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          business_details: Json
          client_details: Json
          client_id: string | null
          created_at: string
          currency: string
          discount_rate: number
          due_date: string
          id: string
          invoice_number: string
          issue_date: string
          items: Json
          notes: string | null
          payment_terms: string | null
          status: string
          subtotal: number
          tax_rate: number
          template: string
          template_styles: Json
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          business_details?: Json
          client_details?: Json
          client_id?: string | null
          created_at?: string
          currency?: string
          discount_rate?: number
          due_date: string
          id?: string
          invoice_number: string
          issue_date: string
          items?: Json
          notes?: string | null
          payment_terms?: string | null
          status?: string
          subtotal?: number
          tax_rate?: number
          template?: string
          template_styles?: Json
          total_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          business_details?: Json
          client_details?: Json
          client_id?: string | null
          created_at?: string
          currency?: string
          discount_rate?: number
          due_date?: string
          id?: string
          invoice_number?: string
          issue_date?: string
          items?: Json
          notes?: string | null
          payment_terms?: string | null
          status?: string
          subtotal?: number
          tax_rate?: number
          template?: string
          template_styles?: Json
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      payouts: {
        Row: {
          amount: number
          created_at: string
          creator_id: string
          id: string
          phone: string
          provider: string
          release_at: string
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          creator_id: string
          id?: string
          phone: string
          provider: string
          release_at?: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          creator_id?: string
          id?: string
          phone?: string
          provider?: string
          release_at?: string
          status?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          avg_views: number
          bio: string
          company_name: string | null
          created_at: string
          engagement_rate: number
          follower_count: number
          full_name: string | null
          id: string
          id_verification_status: string
          location: string
          marketplace_visible: boolean
          payout_number: string | null
          payout_provider: string | null
          phone: string | null
          platforms: Json
          rate_per_video: number
          role: string
          tiktok_handle: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          avg_views?: number
          bio?: string
          company_name?: string | null
          created_at?: string
          engagement_rate?: number
          follower_count?: number
          full_name?: string | null
          id: string
          id_verification_status?: string
          location?: string
          marketplace_visible?: boolean
          payout_number?: string | null
          payout_provider?: string | null
          phone?: string | null
          platforms?: Json
          rate_per_video?: number
          role?: string
          tiktok_handle?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          avg_views?: number
          bio?: string
          company_name?: string | null
          created_at?: string
          engagement_rate?: number
          follower_count?: number
          full_name?: string | null
          id?: string
          id_verification_status?: string
          location?: string
          marketplace_visible?: boolean
          payout_number?: string | null
          payout_provider?: string | null
          phone?: string | null
          platforms?: Json
          rate_per_video?: number
          role?: string
          tiktok_handle?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      submissions: {
        Row: {
          campaign_id: string
          checklist_results: Json
          comments: number
          created_at: string
          creator_id: string
          creator_name: string
          earnings: number
          engagement_rate: number
          id: string
          last_verified_at: string | null
          likes: number
          platform: string
          rejection_reason: string | null
          shares: number
          status: string
          tiktok_handle: string
          tiktok_url: string
          updated_at: string
          verified_views: number
        }
        Insert: {
          campaign_id: string
          checklist_results?: Json
          comments?: number
          created_at?: string
          creator_id: string
          creator_name?: string
          earnings?: number
          engagement_rate?: number
          id?: string
          last_verified_at?: string | null
          likes?: number
          platform?: string
          rejection_reason?: string | null
          shares?: number
          status?: string
          tiktok_handle?: string
          tiktok_url: string
          updated_at?: string
          verified_views?: number
        }
        Update: {
          campaign_id?: string
          checklist_results?: Json
          comments?: number
          created_at?: string
          creator_id?: string
          creator_name?: string
          earnings?: number
          engagement_rate?: number
          id?: string
          last_verified_at?: string | null
          likes?: number
          platform?: string
          rejection_reason?: string | null
          shares?: number
          status?: string
          tiktok_handle?: string
          tiktok_url?: string
          updated_at?: string
          verified_views?: number
        }
        Relationships: [
          {
            foreignKeyName: "submissions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          campaign_id: string | null
          created_at: string
          description: string
          id: string
          type: string
          user_id: string
        }
        Insert: {
          amount?: number
          campaign_id?: string | null
          created_at?: string
          description?: string
          id?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          campaign_id?: string | null
          created_at?: string
          description?: string
          id?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accrue_views: {
        Args: { p_new_views: number; p_submission_id: string }
        Returns: number
      }
      extend_campaign: {
        Args: { p_campaign_id: string; p_days: number }
        Returns: string
      }
      fund_campaign: { Args: { p_campaign_id: string }; Returns: undefined }
      request_payout: {
        Args: { p_amount: number; p_phone: string; p_provider: string }
        Returns: string
      }
      seed_demo_data: { Args: { p_user_id: string }; Returns: undefined }
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
    Enums: {},
  },
} as const
