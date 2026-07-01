import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { supabase } from "./supabaseClient";

export interface Food {
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
  tags: string[];
  created_at: string;
  updated_at: string;
  emoji?: string;
  gradient?: string;
}

export type CartItem = { food: Food; qty: number };

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "delivered"
  | "cancelled";

export const STATUS_FLOW: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
];

export const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Order placed",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready for pickup",
  out_for_delivery: "On the way",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export type Address = {
  id: string;
  label: string;
  line1: string;
  city: string;
  notes?: string;
};

export type Order = {
  id: string;
  items: CartItem[];
  subtotal: number;
  delivery: number;
  total: number;
  status: OrderStatus;
  createdAt: number;
  address: Address;
  customerName: string;
  customerPhone: string;
  rider?: string;
  eta?: number;
};

export type User = {
  // Mirrors customer_profiles.id — NOT a Supabase Auth uid, this app doesn't
  // use Supabase Auth for customers. Kept as `id` (rather than renaming to
  // profileId) so existing effects that key off `user?.id` — see
  // account.tsx's bootstrap effect — refire correctly whenever the active
  // profile changes.
  id?: string;
  name: string;
  email: string;
  phone?: string;
};

type State = {
  user: User | null;
  // customer_profiles.id — different from user.id (auth uid)
  // Stored here so FoodCard and any other component can sync favorites
  customerProfileId: string | null;
  cart: CartItem[];
  favorites: string[];
  addresses: Address[];
  orders: Order[];
  login: (email: string, name?: string, id?: string) => void;
  logout: () => void;
  setCustomerProfileId: (id: string | null) => void;
  addToCart: (food: Food, qty?: number) => void;
  removeFromCart: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clearCart: () => void;
  toggleFavorite: (foodId: string) => void;
  setFavorites: (ids: string[]) => void;
  addAddress: (a: Omit<Address, "id">) => Address;
  removeAddress: (id: string) => void;
  setAddresses: (addrs: Address[]) => void;
  placeOrder: (input: {
    address: Address;
    customerName: string;
    customerPhone: string;
  }) => Order;
  updateOrderStatus: (id: string, status: OrderStatus) => void;
  // Clears everything that could leak between two different identities on
  // the same device (favorites, addresses, orders, and the order-tracking
  // id list) WITHOUT touching the device id itself or the cart. Used when
  // login.tsx resolves a sign-in to a *different* customer_profiles row
  // than whatever was previously active on this device — so the incoming
  // account doesn't inherit a stranger's addresses/orders/favorites, and
  // the outgoing local favorites don't get pushed onto the incoming
  // account. logout() does its own full wipe (see below) rather than
  // calling this, since it additionally rotates the device id and clears
  // the cart/user.
  clearLocalIdentityData: () => void;
};

const DELIVERY_FEE = 150;

// ── Anonymous customer identity ────────────────────────────────────────────
// Single source of truth for "who is this customer" — maps 1:1 to a row in
// customer_profiles.id. There's no Supabase Auth involved; a customer becomes
// "signed in" simply by having a customer_profiles row (created at checkout
// or via login.tsx sign-up), keyed off this localStorage id. checkout.tsx,
// account.tsx, and login.tsx all use these same helpers so favorites,
// addresses, and order history resolve to the same profile instead of
// drifting apart.
export const CUSTOMER_ID_KEY = "crunchyinn_customer_id";

// Device-local list of order ids this browser has placed or looked up —
// lets /orders and /account show order history without requiring a
// customer_profiles row. Previously lived in orders.tsx as `LS_KEY`; moved
// here so logout()/clearLocalIdentityData() can clear it without a circular
// import (orders.tsx already imports STATUS_LABEL/STATUS_FLOW from here).
// Re-exported from orders.tsx under the same name for backward compat.
export const LS_KEY = "crunchyinn_order_ids";

export function getOrCreateCustomerId(): string {
  try {
    const existing = localStorage.getItem(CUSTOMER_ID_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    localStorage.setItem(CUSTOMER_ID_KEY, id);
    return id;
  } catch {
    return crypto.randomUUID(); // fallback if localStorage unavailable
  }
}

// Explicitly point this device at a specific customer_profiles row — used by
// login.tsx after resolving (sign-in) or creating (sign-up) a profile.
// Unlike getOrCreateCustomerId(), this always overwrites.
export function setCustomerId(id: string): void {
  try {
    localStorage.setItem(CUSTOMER_ID_KEY, id);
  } catch {
    // localStorage unavailable — nothing we can persist, caller still gets
    // the id back via the in-memory store update.
  }
}

// Forgets this device's current customer identity by overwriting it with a
// brand-new UUID. Used only by logout() — "forget this customer on this
// device" so a different person can sign in fresh on a shared device.
function rotateCustomerId(): void {
  try {
    localStorage.setItem(CUSTOMER_ID_KEY, crypto.randomUUID());
  } catch {
    // localStorage unavailable
  }
}

function clearSavedOrderIds(): void {
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    // localStorage unavailable
  }
}

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      user: null,
      customerProfileId: null,
      cart: [],
      favorites: [],
      addresses: [],
      orders: [],

      login: (email, name, id) =>
        set({ user: { email, name: name ?? email.split("@")[0], id } }),

      // Full clean-slate: forgets this customer on this device so a
      // different person can sign in fresh. Rotates the raw localStorage
      // device id (not just the in-memory customerProfileId) and clears the
      // separate order-tracking id list, since both survive a plain state
      // reset and would otherwise cause account.tsx's bootstrap effect to
      // silently re-resolve the same profile right after logout.
      logout: () => {
        rotateCustomerId();
        clearSavedOrderIds();
        set({
          user: null,
          cart: [],
          favorites: [],
          addresses: [],
          orders: [],
          customerProfileId: null,
        });
      },

      clearLocalIdentityData: () => {
        clearSavedOrderIds();
        set({ favorites: [], addresses: [], orders: [] });
      },

      // Called by account.tsx after fetching the customer_profiles row
      setCustomerProfileId: (id) => set({ customerProfileId: id }),

      addToCart: (food, qty = 1) =>
        set((s) => {
          const existing = s.cart.find((c) => c.food.id === food.id);
          if (existing) {
            return {
              cart: s.cart.map((c) =>
                c.food.id === food.id ? { ...c, qty: c.qty + qty } : c
              ),
            };
          }
          return { cart: [...s.cart, { food, qty }] };
        }),

      removeFromCart: (id) =>
        set((s) => ({ cart: s.cart.filter((c) => c.food.id !== id) })),

      setQty: (id, qty) =>
        set((s) => ({
          cart:
            qty <= 0
              ? s.cart.filter((c) => c.food.id !== id)
              : s.cart.map((c) => (c.food.id === id ? { ...c, qty } : c)),
        })),

      clearCart: () => set({ cart: [] }),

      // Reads customerProfileId from store itself — no need to pass it as arg
      toggleFavorite: (foodId) => {
        const { favorites, customerProfileId } = get();
        const isCurrentlyFav = favorites.includes(foodId);

        // Update local store immediately for instant UI response
        set({
          favorites: isCurrentlyFav
            ? favorites.filter((f) => f !== foodId)
            : [...favorites, foodId],
        });

        // Sync to Supabase only when a customer_profile exists
        if (!customerProfileId) return;

        if (isCurrentlyFav) {
          supabase
            .from("customer_favorites")
            .delete()
            .eq("customer_profile_id", customerProfileId)
            .eq("food_id", foodId)
            .then(({ error }) => {
              if (error) console.error("Failed to remove favorite:", error);
            });
        } else {
          supabase
            .from("customer_favorites")
            .insert({ customer_profile_id: customerProfileId, food_id: foodId })
            .then(({ error }) => {
              if (error) console.error("Failed to add favorite:", error);
            });
        }
      },

      setFavorites: (ids) => set({ favorites: ids }),

      // Reads customerProfileId from store itself, same pattern as
      // toggleFavorite: optimistic local update first, then fire-and-forget
      // sync to the `addresses` table only when a customer_profile exists.
      addAddress: (a) => {
        const { customerProfileId } = get();
        const addr: Address = { ...a, id: crypto.randomUUID() };

        set((s) => ({ addresses: [...s.addresses, addr] }));

        if (customerProfileId) {
          supabase
            .from("addresses")
            .insert({
              id: addr.id,
              customer_profile_id: customerProfileId,
              label: addr.label,
              line1: addr.line1,
              city: addr.city,
              notes: addr.notes ?? null,
            } as any)
            .then(({ error }) => {
              if (error) console.error("Failed to save address:", error);
            });
        }

        return addr;
      },

      removeAddress: (id) => {
        const { customerProfileId } = get();
        set((s) => ({ addresses: s.addresses.filter((a) => a.id !== id) }));

        if (customerProfileId) {
          supabase
            .from("addresses")
            .delete()
            .eq("id", id)
            .then(({ error }) => {
              if (error) console.error("Failed to delete address:", error);
            });
        }
      },

      setAddresses: (addrs) => set({ addresses: addrs }),

      placeOrder: ({ address, customerName, customerPhone }) => {
        const cart = get().cart;
        const subtotal = cart.reduce((s, c) => s + c.food.price * c.qty, 0);
        const order: Order = {
          id: `ORD-${Date.now().toString().slice(-6)}`,
          items: cart,
          subtotal,
          delivery: DELIVERY_FEE,
          total: subtotal + DELIVERY_FEE,
          status: "pending",
          createdAt: Date.now(),
          address,
          customerName,
          customerPhone,
          eta: 35,
        };
        set((s) => ({ orders: [order, ...s.orders], cart: [] }));
        return order;
      },

      updateOrderStatus: (id, status) =>
        set((s) => ({
          orders: s.orders.map((o) => (o.id === id ? { ...o, status } : o)),
        })),
    }),
    {
      name: "Crunchy Inn-store",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? window.localStorage
          : ({
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
            } as unknown as Storage)
      ),
      skipHydration: true,
      partialize: (s) => ({
        user: s.user,
        customerProfileId: s.customerProfileId,
        cart: s.cart,
        favorites: s.favorites,
        addresses: s.addresses,
        orders: s.orders,
      }),
    }
  )
);

export const DELIVERY = DELIVERY_FEE;