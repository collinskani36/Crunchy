// ============================================================
// lib/api.ts
// Data-access helpers — drop into your React / Vite project
// All writes avoid .select().single() after insert (anon-safe)
// ============================================================

import { supabase } from './supabaseClient';   // your existing client
import type { PlaceOrderPayload, DbFood, DbCategory, DbOrder } from '../types/supabase';

// ── MENU ────────────────────────────────────────────────────

/** Fetch all active categories ordered by sort_order */
export async function fetchCategories(): Promise<DbCategory[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw error;
  return data ?? [];
}

/** Fetch all available foods, optionally filtered by category */
export async function fetchFoods(categoryId?: string): Promise<DbFood[]> {
  let query = supabase
    .from('foods')
    .select('*')
    .eq('is_available', true)
    .order('is_popular', { ascending: false });

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data ?? [];
}

/** Fetch popular foods only */
export async function fetchPopularFoods(): Promise<DbFood[]> {
  const { data, error } = await supabase
    .from('foods')
    .select('*')
    .eq('is_available', true)
    .eq('is_popular', true);
  if (error) throw error;
  return data ?? [];
}

/** Fetch a single food by id */
export async function fetchFood(id: string): Promise<DbFood | null> {
  const { data, error } = await supabase
    .from('foods')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

// ── ORDERS ──────────────────────────────────────────────────

/**
 * Place a new order (anon-safe).
 * Returns only the new order id — avoids SELECT after insert.
 */
export async function placeOrder(payload: PlaceOrderPayload): Promise<string> {
  const subtotal = payload.items.reduce(
    (sum, i) => sum + i.food.price * i.quantity,
    0,
  );
  const total = subtotal + payload.deliveryFee;

  // 1. Insert order — do NOT chain .select() here (breaks anon RLS)
  const { error: orderError } = await supabase.from('orders').insert({
    customer_name: payload.customerName,
    customer_phone: payload.customerPhone,
    customer_email: payload.customerEmail ?? null,
    delivery_address: payload.deliveryAddress,
    delivery_lat: payload.deliveryLat ?? null,
    delivery_lng: payload.deliveryLng ?? null,
    delivery_notes: payload.deliveryNotes ?? null,
    payment_method: payload.paymentMethod,
    subtotal,
    delivery_fee: payload.deliveryFee,
    total,
    status: 'pending',
    is_paid: false,
  });
  if (orderError) throw orderError;

  // 2. Fetch the order id by matching phone + created_at (most recent)
  const { data: orderRow, error: fetchError } = await supabase
    .from('orders')
    .select('id')
    .eq('customer_phone', payload.customerPhone)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (fetchError || !orderRow) throw fetchError ?? new Error('Order not found after insert');

  const orderId = orderRow.id;

  // 3. Insert order items
  const items = payload.items.map((i) => ({
    order_id: orderId,
    food_id: i.food.id,
    food_name: i.food.name,
    food_price: i.food.price,
    quantity: i.quantity,
    notes: i.notes ?? null,
  }));

  const { error: itemsError } = await supabase.from('order_items').insert(items);
  if (itemsError) throw itemsError;

  return orderId;
}

/** Fetch a single order with its items (for order confirmation page) */
export async function fetchOrder(orderId: string) {
  const { data: order, error: oErr } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle();
  if (oErr) throw oErr;

  const { data: items, error: iErr } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId);
  if (iErr) throw iErr;

  return { order, items: items ?? [] };
}

/** Real-time subscription to a single order's status */
export function subscribeToOrder(
  orderId: string,
  onUpdate: (order: DbOrder) => void,
) {
  return supabase
    .channel(`order:${orderId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'orders',
        filter: `id=eq.${orderId}`,
      },
      (payload) => onUpdate(payload.new as DbOrder),
    )
    .subscribe();
}

// ── DELIVERY TIERS ──────────────────────────────────────────

/** Pick the correct delivery fee for a given distance */
export async function resolveDeliveryFee(distanceKm: number): Promise<number> {
  const { data, error } = await supabase
    .from('delivery_tiers')
    .select('fee, max_distance_km')
    .eq('is_active', true)
    .gte('max_distance_km', distanceKm)
    .order('max_distance_km')
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.fee ?? 0;
}

// ── IMAGE UPLOAD ────────────────────────────────────────────

/**
 * Upload a food image to Supabase Storage.
 * Returns the public URL to store in foods.image_url.
 *
 * Usage (admin panel):
 *   const url = await uploadFoodImage(file, 'f1.jpg');
 */
export async function uploadFoodImage(file: File, filename: string): Promise<string> {
  const { error } = await supabase.storage
    .from('food-images')                  // bucket must be public
    .upload(filename, file, { upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from('food-images').getPublicUrl(filename);
  return data.publicUrl;
}

export async function uploadCategoryImage(file: File, filename: string): Promise<string> {
  const { error } = await supabase.storage
    .from('category-images')
    .upload(filename, file, { upsert: true });
  if (error) throw error;

  const { data } = supabase.storage.from('category-images').getPublicUrl(filename);
  return data.publicUrl;
}