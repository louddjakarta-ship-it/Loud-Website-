export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18";
  };
  public: {
    Tables: {
      admin_profiles: {
        Row: {
          created_at: string;
          display_name: string | null;
          id: string;
          is_active: boolean;
          role: Database["public"]["Enums"]["admin_role"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          display_name?: string | null;
          id: string;
          is_active?: boolean;
          role?: Database["public"]["Enums"]["admin_role"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          display_name?: string | null;
          id?: string;
          is_active?: boolean;
          role?: Database["public"]["Enums"]["admin_role"];
          updated_at?: string;
        };
        Relationships: [];
      };
      events: {
        Row: {
          archived_at: string | null;
          created_at: string;
          created_by: string | null;
          description: string | null;
          event_date: string;
          flyer_path: string | null;
          guestlist_token: string;
          id: string;
          is_published: boolean;
          maps_url: string | null;
          name: string;
          registration_open: boolean;
          slug: string;
          updated_at: string;
          venue: string | null;
          whatsapp_number: string | null;
        };
        Insert: {
          archived_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          event_date: string;
          flyer_path?: string | null;
          guestlist_token?: string;
          id?: string;
          is_published?: boolean;
          maps_url?: string | null;
          name: string;
          registration_open?: boolean;
          slug: string;
          updated_at?: string;
          venue?: string | null;
          whatsapp_number?: string | null;
        };
        Update: {
          archived_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          event_date?: string;
          flyer_path?: string | null;
          guestlist_token?: string;
          id?: string;
          is_published?: boolean;
          maps_url?: string | null;
          name?: string;
          registration_open?: boolean;
          slug?: string;
          updated_at?: string;
          venue?: string | null;
          whatsapp_number?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "events_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "admin_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      gallery_photos: {
        Row: {
          caption: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          storage_path: string;
        };
        Insert: {
          caption?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          storage_path: string;
        };
        Update: {
          caption?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: "gallery_photos_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "admin_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      guestlist: {
        Row: {
          admin_note: string | null;
          comment_proof_path: string;
          created_at: string;
          event_id: string;
          full_name: string;
          id: string;
          instagram: string;
          reference_person: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: Database["public"]["Enums"]["guestlist_status"];
          story_proof_path: string;
          submission_key: string;
        };
        Insert: {
          admin_note?: string | null;
          comment_proof_path: string;
          created_at?: string;
          event_id: string;
          full_name: string;
          id?: string;
          instagram: string;
          reference_person: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["guestlist_status"];
          story_proof_path: string;
          submission_key: string;
        };
        Update: {
          admin_note?: string | null;
          comment_proof_path?: string;
          created_at?: string;
          event_id?: string;
          full_name?: string;
          id?: string;
          instagram?: string;
          reference_person?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: Database["public"]["Enums"]["guestlist_status"];
          story_proof_path?: string;
          submission_key?: string;
        };
        Relationships: [
          {
            foreignKeyName: "guestlist_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "guestlist_reviewed_by_fkey";
            columns: ["reviewed_by"];
            isOneToOne: false;
            referencedRelation: "admin_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      site_settings: {
        Row: {
          hero_description: string;
          hero_tagline: string;
          id: boolean;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          hero_description: string;
          hero_tagline: string;
          id?: boolean;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          hero_description?: string;
          hero_tagline?: string;
          id?: boolean;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "site_settings_updated_by_fkey";
            columns: ["updated_by"];
            isOneToOne: false;
            referencedRelation: "admin_profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      submission_attempts: {
        Row: {
          created_at: string;
          event_id: string | null;
          id: number;
          ip_hash: string;
          kind: string;
        };
        Insert: {
          created_at?: string;
          event_id?: string | null;
          id?: number;
          ip_hash: string;
          kind?: string;
        };
        Update: {
          created_at?: string;
          event_id?: string | null;
          id?: number;
          ip_hash?: string;
          kind?: string;
        };
        Relationships: [
          {
            foreignKeyName: "submission_attempts_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "events";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      get_guestlist_event_link: {
        Args: { link_token: string };
        Returns: {
          description: string | null;
          event_date: string;
          flyer_path: string | null;
          id: string;
          name: string;
          slug: string;
          venue: string | null;
          whatsapp_number: string | null;
        }[];
      };
    };
    Enums: {
      admin_role: "super_admin" | "staff";
      guestlist_status: "pending" | "approved" | "rejected";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      admin_role: ["super_admin", "staff"],
      guestlist_status: ["pending", "approved", "rejected"],
    },
  },
} as const;
