// ============================================================
// types/supabase.ts
// Generated Supabase types + lightweight helpers
// Synkani Solutions — Food Ordering Platform
// ============================================================

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'out_for_delivery'
  | 'delivered'
  | 'cancelled';

// ── Database row types ─────────────────────────────────────

export interface DbCategory {
  id: string;
  name: string;
  emoji: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface DbFood {
  id: string;
  name: string;
  description: string;
  price: number;
  category_id: string;
  image_url: string | null;
  rating: number;
  prep_time: string | null;
  is_popular: boolean;
  is_available: boolean;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
}

export interface DbOrder {
  id: string;
  customer_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  delivery_address: string | null;
  delivery_lat: number | null;
  delivery_lng: number | null;
  delivery_notes: string | null;
  status: OrderStatus;
  subtotal: number;
  delivery_fee: number;
  total: number;
  payment_method: string | null;
  payment_reference: string | null;
  is_paid: boolean;
  rider_id: string | null;
  estimated_delivery: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbOrderItem {
  id: string;
  order_id: string;
  food_id: string;
  food_name: string;
  food_price: number;
  quantity: number;
  item_total: number;          // generated column
  notes: string | null;
  created_at: string;
}

export interface DbRider {
  id: string;
  name: string;
  phone: string;
  photo_url: string | null;
  is_active: boolean;
  is_online: boolean;
  rating: number;
  current_lat: number | null;
  current_lng: number | null;
  created_at: string;
  updated_at: string;
}

export interface DbDeliveryTier {
  id: string;
  label: string;
  max_distance_km: number;
  fee: number;
  is_active: boolean;
  created_at: string;
}

export interface DbReview {
  id: string;
  order_id: string;
  food_id: string | null;
  customer_id: string | null;
  rating: number;
  comment: string | null;
  created_at: string;
}

export interface DbCustomerProfile {
  id: string;
  user_id: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
}

// ── Supabase Database type (for createClient<Database>()) ──

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: DbCategory;
        Insert: Omit<DbCategory, 'created_at'>;
        Update: Partial<Omit<DbCategory, 'id' | 'created_at'>>;
      };
      foods: {
        Row: DbFood;
        Insert: Omit<DbFood, 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DbFood, 'id' | 'created_at' | 'updated_at'>>;
      };
      orders: {
        Row: DbOrder;
        Insert: Omit<DbOrder, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DbOrder, 'id' | 'created_at' | 'updated_at'>>;
      };
      order_items: {
        Row: DbOrderItem;
        Insert: Omit<DbOrderItem, 'id' | 'item_total' | 'created_at'>;
        Update: never;         // items are immutable after creation
      };
      riders: {
        Row: DbRider;
        Insert: Omit<DbRider, 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Omit<DbRider, 'id' | 'created_at' | 'updated_at'>>;
      };
      delivery_tiers: {
        Row: DbDeliveryTier;
        Insert: Omit<DbDeliveryTier, 'id' | 'created_at'>;
        Update: Partial<Omit<DbDeliveryTier, 'id' | 'created_at'>>;
      };
      reviews: {
        Row: DbReview;
        Insert: Omit<DbReview, 'id' | 'created_at'>;
        Update: never;
      };
      customer_profiles: {
        Row: DbCustomerProfile;
        Insert: Omit<DbCustomerProfile, 'id' | 'created_at'>;
        Update: Partial<Omit<DbCustomerProfile, 'id' | 'created_at'>>;
      };
    };
    Enums: {
      order_status: OrderStatus;
    };
  };
}

// ── Helpers ────────────────────────────────────────────────

/**
 * Build a public URL for a food image stored in Supabase Storage.
 *
 * Usage:
 *   import { supabase } from '@/lib/supabaseClient';
 *   const url = getFoodImageUrl(supabase, 'f1.jpg');
 */
export function getFoodImageUrl(
  supabase: { storage: { from: (b: string) => { getPublicUrl: (p: string) => { data: { publicUrl: string } } } } },
  path: string,
): string {
  const { data } = supabase.storage.from('food-images').getPublicUrl(path);
  return data.publicUrl;
}

export function getCategoryImageUrl(
  supabase: { storage: { from: (b: string) => { getPublicUrl: (p: string) => { data: { publicUrl: string } } } } },
  path: string,
): string {
  const { data } = supabase.storage.from('category-images').getPublicUrl(path);
  return data.publicUrl;
}

/** Format price — same helper as before */
export function formatPrice(n: number): string {
  return `$${n.toFixed(2)}`;
}

/** Cart item used on the frontend */
export interface CartItem {
  food: DbFood;
  quantity: number;
  notes?: string;
}

/** Calculate subtotal from cart */
export function cartSubtotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.food.price * i.quantity, 0);
}

/** Shape expected when placing an order (anon-safe) */
export interface PlaceOrderPayload {
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryAddress: string;
  deliveryLat?: number;
  deliveryLng?: number;
  deliveryNotes?: string;
  paymentMethod: 'mpesa' | 'cash' | 'card';
  items: CartItem[];
  deliveryFee: number;
}