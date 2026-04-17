export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string;
          logo_url: string;
          status: 'active' | 'suspended' | 'pending' | 'cancelled';
          plan: 'free' | 'starter' | 'professional' | 'enterprise';
          stripe_customer_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string;
          logo_url?: string;
          status?: 'active' | 'suspended' | 'pending' | 'cancelled';
          plan?: 'free' | 'starter' | 'professional' | 'enterprise';
          stripe_customer_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          description?: string;
          logo_url?: string;
          status?: 'active' | 'suspended' | 'pending' | 'cancelled';
          plan?: 'free' | 'starter' | 'professional' | 'enterprise';
          stripe_customer_id?: string | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_profiles: {
        Row: {
          id: string;
          full_name: string;
          avatar_url: string;
          system_role: 'super_admin' | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string;
          avatar_url?: string;
          system_role?: 'super_admin' | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          full_name?: string;
          avatar_url?: string;
          system_role?: 'super_admin' | null;
          updated_at?: string;
        };
        Relationships: [];
      };
      tenant_memberships: {
        Row: {
          id: string;
          user_id: string;
          tenant_id: string;
          role: 'store_admin' | 'manager' | 'operative';
          is_active: boolean;
          invited_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          tenant_id: string;
          role: 'store_admin' | 'manager' | 'operative';
          is_active?: boolean;
          invited_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          tenant_id?: string;
          role?: 'store_admin' | 'manager' | 'operative';
          is_active?: boolean;
          invited_by?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tenant_memberships_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tenant_memberships_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "user_profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      store_settings: {
        Row: {
          id: string;
          tenant_id: string;
          key: string;
          value: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          key: string;
          value?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          key?: string;
          value?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          tenant_id: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          plan: string;
          status: 'active' | 'past_due' | 'cancelled' | 'trialing' | 'incomplete';
          current_period_start: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          plan?: string;
          status?: 'active' | 'past_due' | 'cancelled' | 'trialing' | 'incomplete';
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
        };
        Update: {
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          plan?: string;
          status?: 'active' | 'past_due' | 'cancelled' | 'trialing' | 'incomplete';
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          tenant_id: string;
          parent_id: string | null;
          name: string;
          slug: string;
          description: string;
          image_url: string;
          is_active: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          parent_id?: string | null;
          name: string;
          slug: string;
          description?: string;
          image_url?: string;
          is_active?: boolean;
          sort_order?: number;
        };
        Update: {
          parent_id?: string | null;
          name?: string;
          slug?: string;
          description?: string;
          image_url?: string;
          is_active?: boolean;
          sort_order?: number;
        };
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          tenant_id: string;
          category_id: string | null;
          name: string;
          slug: string;
          description: string;
          short_description: string;
          price: number;
          compare_at_price: number | null;
          cost_price: number | null;
          images: Json;
          tags: string[];
          status: 'active' | 'draft' | 'archived';
          is_featured: boolean;
          seo_title: string;
          seo_description: string;
          weight: number;
          requires_shipping: boolean;
          track_inventory: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          category_id?: string | null;
          name: string;
          slug: string;
          description?: string;
          short_description?: string;
          price: number;
          compare_at_price?: number | null;
          cost_price?: number | null;
          images?: Json;
          tags?: string[];
          status?: 'active' | 'draft' | 'archived';
          is_featured?: boolean;
          seo_title?: string;
          seo_description?: string;
          weight?: number;
          requires_shipping?: boolean;
          track_inventory?: boolean;
        };
        Update: {
          category_id?: string | null;
          name?: string;
          slug?: string;
          description?: string;
          short_description?: string;
          price?: number;
          compare_at_price?: number | null;
          cost_price?: number | null;
          images?: Json;
          tags?: string[];
          status?: 'active' | 'draft' | 'archived';
          is_featured?: boolean;
          seo_title?: string;
          seo_description?: string;
          weight?: number;
          requires_shipping?: boolean;
          track_inventory?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "categories";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "products_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      product_variants: {
        Row: {
          id: string;
          product_id: string;
          tenant_id: string;
          name: string;
          sku: string;
          price_override: number | null;
          stock_qty: number;
          low_stock_threshold: number;
          attributes: Json;
          image_url: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          product_id: string;
          tenant_id: string;
          name?: string;
          sku: string;
          price_override?: number | null;
          stock_qty?: number;
          low_stock_threshold?: number;
          attributes?: Json;
          image_url?: string;
          is_active?: boolean;
        };
        Update: {
          name?: string;
          sku?: string;
          price_override?: number | null;
          stock_qty?: number;
          low_stock_threshold?: number;
          attributes?: Json;
          image_url?: string;
          is_active?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "product_variants_product_id_fkey";
            columns: ["product_id"];
            isOneToOne: false;
            referencedRelation: "products";
            referencedColumns: ["id"];
          }
        ];
      };
      inventory_logs: {
        Row: {
          id: string;
          variant_id: string;
          tenant_id: string;
          change_qty: number;
          previous_qty: number;
          new_qty: number;
          reason: 'sale' | 'return' | 'manual_adjustment' | 'restock' | 'damage' | 'transfer';
          notes: string;
          performed_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          variant_id: string;
          tenant_id: string;
          change_qty: number;
          previous_qty: number;
          new_qty: number;
          reason?: 'sale' | 'return' | 'manual_adjustment' | 'restock' | 'damage' | 'transfer';
          notes?: string;
          performed_by?: string | null;
        };
        Update: {
          notes?: string;
          reason?: 'sale' | 'return' | 'manual_adjustment' | 'restock' | 'damage' | 'transfer';
        };
        Relationships: [];
      };
      customers: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string | null;
          email: string;
          full_name: string;
          phone: string;
          notes: string;
          tags: string[];
          total_orders: number;
          total_spent: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id?: string | null;
          email: string;
          full_name?: string;
          phone?: string;
          notes?: string;
          tags?: string[];
          total_orders?: number;
          total_spent?: number;
        };
        Update: {
          user_id?: string | null;
          email?: string;
          full_name?: string;
          phone?: string;
          notes?: string;
          tags?: string[];
          total_orders?: number;
          total_spent?: number;
        };
        Relationships: [];
      };
      addresses: {
        Row: {
          id: string;
          customer_id: string;
          tenant_id: string;
          full_name: string;
          line1: string;
          line2: string;
          city: string;
          state: string;
          zip: string;
          country: string;
          phone: string;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          customer_id: string;
          tenant_id: string;
          full_name?: string;
          line1?: string;
          line2?: string;
          city?: string;
          state?: string;
          zip?: string;
          country?: string;
          phone?: string;
          is_default?: boolean;
        };
        Update: {
          full_name?: string;
          line1?: string;
          line2?: string;
          city?: string;
          state?: string;
          zip?: string;
          country?: string;
          phone?: string;
          is_default?: boolean;
        };
        Relationships: [];
      };
      discount_codes: {
        Row: {
          id: string;
          tenant_id: string;
          code: string;
          type: 'percent' | 'fixed';
          value: number;
          min_order_amount: number;
          max_uses: number | null;
          used_count: number;
          is_active: boolean;
          expires_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          code: string;
          type?: 'percent' | 'fixed';
          value?: number;
          min_order_amount?: number;
          max_uses?: number | null;
          used_count?: number;
          is_active?: boolean;
          expires_at?: string | null;
        };
        Update: {
          code?: string;
          type?: 'percent' | 'fixed';
          value?: number;
          min_order_amount?: number;
          max_uses?: number | null;
          used_count?: number;
          is_active?: boolean;
          expires_at?: string | null;
        };
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          tenant_id: string;
          customer_id: string | null;
          order_number: string;
          status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
          payment_status: 'unpaid' | 'paid' | 'partial' | 'refunded' | 'failed';
          subtotal: number;
          discount_amount: number;
          tax_amount: number;
          shipping_amount: number;
          total_amount: number;
          currency: string;
          discount_code_id: string | null;
          stripe_payment_intent_id: string | null;
          shipping_address: Json;
          billing_address: Json;
          notes: string;
          staff_notes: string;
          shipped_at: string | null;
          delivered_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          customer_id?: string | null;
          order_number: string;
          status?: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
          payment_status?: 'unpaid' | 'paid' | 'partial' | 'refunded' | 'failed';
          subtotal?: number;
          discount_amount?: number;
          tax_amount?: number;
          shipping_amount?: number;
          total_amount?: number;
          currency?: string;
          discount_code_id?: string | null;
          stripe_payment_intent_id?: string | null;
          shipping_address?: Json;
          billing_address?: Json;
          notes?: string;
          staff_notes?: string;
          shipped_at?: string | null;
          delivered_at?: string | null;
        };
        Update: {
          customer_id?: string | null;
          status?: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
          payment_status?: 'unpaid' | 'paid' | 'partial' | 'refunded' | 'failed';
          subtotal?: number;
          discount_amount?: number;
          tax_amount?: number;
          shipping_amount?: number;
          total_amount?: number;
          currency?: string;
          discount_code_id?: string | null;
          stripe_payment_intent_id?: string | null;
          shipping_address?: Json;
          billing_address?: Json;
          notes?: string;
          staff_notes?: string;
          shipped_at?: string | null;
          delivered_at?: string | null;
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
            foreignKeyName: "orders_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          tenant_id: string;
          variant_id: string | null;
          product_name: string;
          variant_name: string;
          sku: string;
          quantity: number;
          unit_price: number;
          total_price: number;
          product_image: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          tenant_id: string;
          variant_id?: string | null;
          product_name?: string;
          variant_name?: string;
          sku?: string;
          quantity?: number;
          unit_price?: number;
          total_price?: number;
          product_image?: string;
        };
        Update: {
          variant_id?: string | null;
          product_name?: string;
          variant_name?: string;
          sku?: string;
          quantity?: number;
          unit_price?: number;
          total_price?: number;
          product_image?: string;
        };
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey";
            columns: ["order_id"];
            isOneToOne: false;
            referencedRelation: "orders";
            referencedColumns: ["id"];
          }
        ];
      };
      themes: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string;
          preview_url: string;
          thumbnail_url: string;
          is_active: boolean;
          default_config: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string;
          preview_url?: string;
          thumbnail_url?: string;
          is_active?: boolean;
          default_config?: Json;
        };
        Update: {
          name?: string;
          slug?: string;
          description?: string;
          preview_url?: string;
          thumbnail_url?: string;
          is_active?: boolean;
          default_config?: Json;
        };
        Relationships: [];
      };
      tenant_themes: {
        Row: {
          id: string;
          tenant_id: string;
          theme_id: string;
          config: Json;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          theme_id: string;
          config?: Json;
          is_active?: boolean;
        };
        Update: {
          tenant_id?: string;
          theme_id?: string;
          config?: Json;
          is_active?: boolean;
        };
        Relationships: [
          {
            foreignKeyName: "tenant_themes_tenant_id_fkey";
            columns: ["tenant_id"];
            isOneToOne: false;
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tenant_themes_theme_id_fkey";
            columns: ["theme_id"];
            isOneToOne: false;
            referencedRelation: "themes";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      generate_order_number: {
        Args: { p_tenant_id: string };
        Returns: string;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type Tenant = Database['public']['Tables']['tenants']['Row'];
export type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
export type TenantMembership = Database['public']['Tables']['tenant_memberships']['Row'];
export type Product = Database['public']['Tables']['products']['Row'];
export type ProductVariant = Database['public']['Tables']['product_variants']['Row'];
export type Category = Database['public']['Tables']['categories']['Row'];
export type Order = Database['public']['Tables']['orders']['Row'];
export type OrderItem = Database['public']['Tables']['order_items']['Row'];
export type Customer = Database['public']['Tables']['customers']['Row'];
export type Theme = Database['public']['Tables']['themes']['Row'];
export type TenantTheme = Database['public']['Tables']['tenant_themes']['Row'];
export type StoreSetting = Database['public']['Tables']['store_settings']['Row'];
export type Subscription = Database['public']['Tables']['subscriptions']['Row'];
export type InventoryLog = Database['public']['Tables']['inventory_logs']['Row'];
export type DiscountCode = Database['public']['Tables']['discount_codes']['Row'];

export type UserRole = 'super_admin' | 'store_admin' | 'manager' | 'operative';

export interface ThemeConfig {
  colors: {
    primary: string;
    primary_foreground: string;
    secondary: string;
    secondary_foreground: string;
    accent: string;
    accent_foreground: string;
    background: string;
    foreground: string;
    muted: string;
    muted_foreground: string;
    border: string;
    card: string;
    card_foreground: string;
  };
  fonts: {
    heading: string;
    body: string;
  };
  radius: string;
  layout: {
    header_sticky: boolean;
    show_announcement_bar: boolean;
    product_grid_cols: number;
    show_product_quick_view: boolean;
  };
}

export interface ProductImage {
  url: string;
  alt: string;
}
