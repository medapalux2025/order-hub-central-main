export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      customers: {
        Row: {
          address: string | null;
          city: string | null;
          created_at: string;
          full_name: string;
          id: string;
          last_order_at: string | null;
          phone: string;
          status: Database["public"]["Enums"]["customer_status"];
          total_orders: number;
          total_spent: number;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          city?: string | null;
          created_at?: string;
          full_name: string;
          id?: string;
          last_order_at?: string | null;
          phone: string;
          status?: Database["public"]["Enums"]["customer_status"];
          total_orders?: number;
          total_spent?: number;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          city?: string | null;
          created_at?: string;
          full_name?: string;
          id?: string;
          last_order_at?: string | null;
          phone?: string;
          status?: Database["public"]["Enums"]["customer_status"];
          total_orders?: number;
          total_spent?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      api_request_logs: {
        Row: {
          api_key_hash: string | null;
          created_at: string;
          error_message: string | null;
          id: string;
          ip: string | null;
          landing_page_id: string | null;
          method: string;
          origin: string | null;
          path: string;
          status_code: number | null;
        };
        Insert: {
          api_key_hash?: string | null;
          created_at?: string;
          error_message?: string | null;
          id?: string;
          ip?: string | null;
          landing_page_id?: string | null;
          method?: string;
          origin?: string | null;
          path?: string;
          status_code?: number | null;
        };
        Update: {
          api_key_hash?: string | null;
          created_at?: string;
          error_message?: string | null;
          id?: string;
          ip?: string | null;
          landing_page_id?: string | null;
          method?: string;
          origin?: string | null;
          path?: string;
          status_code?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "api_request_logs_landing_page_id_fkey";
            columns: ["landing_page_id"];
            isOneToOne: false;
            referencedRelation: "landing_pages";
            referencedColumns: ["id"];
          },
        ];
      };
      landing_pages: {
        Row: {
          api_key_hash: string | null;
          api_key_prefix: string | null;
          created_at: string;
          id: string;
          is_active: boolean;
          name: string;
          product_id: string | null;
          slug: string;
          updated_at: string;
          url: string | null;
          visits: number;
        };
        Insert: {
          api_key_hash?: string | null;
          api_key_prefix?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name: string;
          product_id?: string | null;
          slug: string;
          updated_at?: string;
          url?: string | null;
          visits?: number;
        };
        Update: {
          api_key_hash?: string | null;
          api_key_prefix?: string | null;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          name?: string;
          product_id?: string | null;
          slug?: string;
          updated_at?: string;
          url?: string | null;
          visits?: number;
        };
        Relationships: [
          {
            foreignKeyName: "landing_pages_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      order_items: {
        Row: {
          created_at: string;
          id: string;
          order_id: string;
          product_id: string | null;
          product_name: string;
          quantity: number;
          total_price: number;
          unit_price: number;
        };
        Insert: {
          created_at?: string;
          id?: string;
          order_id: string;
          product_id?: string | null;
          product_name: string;
          quantity?: number;
          total_price: number;
          unit_price: number;
        };
        Update: {
          created_at?: string;
          id?: string;
          order_id?: string;
          product_id?: string | null;
          product_name?: string;
          quantity?: number;
          total_price?: number;
          unit_price?: number;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "order_items_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      order_status_history: {
        Row: {
          changed_by: string | null;
          created_at: string;
          from_status: Database["public"]["Enums"]["order_status"] | null;
          id: string;
          note: string | null;
          order_id: string;
          to_status: Database["public"]["Enums"]["order_status"];
        };
        Insert: {
          changed_by?: string | null;
          created_at?: string;
          from_status?: Database["public"]["Enums"]["order_status"] | null;
          id?: string;
          note?: string | null;
          order_id: string;
          to_status: Database["public"]["Enums"]["order_status"];
        };
        Update: {
          changed_by?: string | null;
          created_at?: string;
          from_status?: Database["public"]["Enums"]["order_status"] | null;
          id?: string;
          note?: string | null;
          order_id?: string;
          to_status?: Database["public"]["Enums"]["order_status"];
        };
        Relationships: [
          {
            foreignKeyName: "order_status_history_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          },
        ];
      };
      orders: {
        Row: {
          address: string | null;
          campaign: string | null;
          city: string | null;
          created_at: string;
          customer_id: string | null;
          customer_name: string;
          id: string;
          internal_notes: string | null;
          landing_page_id: string | null;
          notes: string | null;
          order_number: number;
          phone: string;
          product_id: string | null;
          quantity: number;
          source: string;
          status: Database["public"]["Enums"]["order_status"];
          total_price: number;
          unit_price: number;
          updated_at: string;
          utm_campaign: string | null;
          utm_content: string | null;
          utm_medium: string | null;
          utm_source: string | null;
        };
        Insert: {
          address?: string | null;
          campaign?: string | null;
          city?: string | null;
          created_at?: string;
          customer_id?: string | null;
          customer_name: string;
          id?: string;
          internal_notes?: string | null;
          landing_page_id?: string | null;
          notes?: string | null;
          order_number?: number;
          phone: string;
          product_id?: string | null;
          quantity?: number;
          source?: string;
          status?: Database["public"]["Enums"]["order_status"];
          total_price: number;
          unit_price: number;
          updated_at?: string;
          utm_campaign?: string | null;
          utm_content?: string | null;
          utm_medium?: string | null;
          utm_source?: string | null;
        };
        Update: {
          address?: string | null;
          campaign?: string | null;
          city?: string | null;
          created_at?: string;
          customer_id?: string | null;
          customer_name?: string;
          id?: string;
          internal_notes?: string | null;
          landing_page_id?: string | null;
          notes?: string | null;
          order_number?: number;
          phone?: string;
          product_id?: string | null;
          quantity?: number;
          source?: string;
          status?: Database["public"]["Enums"]["order_status"];
          total_price?: number;
          unit_price?: number;
          updated_at?: string;
          utm_campaign?: string | null;
          utm_content?: string | null;
          utm_medium?: string | null;
          utm_source?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey";
            columns: ["customer_id"];
            isOneToOne: false;
            referencedRelation: "customers";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_landing_page_id_fkey";
            columns: ["landing_page_id"];
            isOneToOne: false;
            referencedRelation: "landing_pages";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "orders_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          },
        ];
      };
      products: {
        Row: {
          compare_at_price: number | null;
          created_at: string;
          description: string | null;
          id: string;
          image_url: string | null;
          is_active: boolean;
          name: string;
          price: number;
          sku: string | null;
          slug: string;
          stock_quantity: number;
          updated_at: string;
        };
        Insert: {
          compare_at_price?: number | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          name: string;
          price: number;
          sku?: string | null;
          slug: string;
          stock_quantity?: number;
          updated_at?: string;
        };
        Update: {
          compare_at_price?: number | null;
          created_at?: string;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          is_active?: boolean;
          name?: string;
          price?: number;
          sku?: string | null;
          slug?: string;
          stock_quantity?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          avatar_url: string | null;
          created_at: string;
          email: string | null;
          full_name: string | null;
          id: string;
          updated_at: string;
        };
        Insert: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id: string;
          updated_at?: string;
        };
        Update: {
          avatar_url?: string | null;
          created_at?: string;
          email?: string | null;
          full_name?: string | null;
          id?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          created_at: string;
          id: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          role: Database["public"]["Enums"]["app_role"];
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          role?: Database["public"]["Enums"]["app_role"];
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      generate_landing_page_api_key: {
        Args: { _landing_page_id: string };
        Returns: string;
      };
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"];
          _user_id: string;
        };
        Returns: boolean;
      };
      is_staff: { Args: { _user_id: string }; Returns: boolean };
      track_landing_page_visit: { Args: { _slug: string }; Returns: number };
    };
    Enums: {
      app_role: "admin" | "staff";
      customer_status: "active" | "vip" | "blocked";
      order_status:
        "new" | "confirmed" | "preparing" | "shipped" | "delivered" | "cancelled" | "returned";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Tables"] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
    keyof DefaultSchema["Enums"] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema["CompositeTypes"] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["admin", "staff"],
      customer_status: ["active", "vip", "blocked"],
      order_status: [
        "new",
        "confirmed",
        "preparing",
        "shipped",
        "delivered",
        "cancelled",
        "returned",
      ],
    },
  },
} as const;
