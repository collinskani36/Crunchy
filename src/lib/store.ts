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
  id?: string; // Supabase auth user ID (auth.users)
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
  placeOrder: (input: {
    address: Address;
    customerName: string;
    customerPhone: string;
  }) => Order;
  updateOrderStatus: (id: string, status: OrderStatus) => void;
};

const DELIVERY_FEE = 150;

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      user: null,
      customerProfileId: null,
      cart: [],
      favorites: [],
      addresses: [
        {
          id: "a1",
          label: "Home",
          line1: "12 Baker Street",
          city: "Eldoret",
          notes: "Ring twice",
        },
      ],
      orders: [],

      login: (email, name, id) =>
        set({ user: { email, name: name ?? email.split("@")[0], id } }),

      logout: () =>
        set({ user: null, cart: [], favorites: [], customerProfileId: null }),

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

      addAddress: (a) => {
        const addr: Address = { ...a, id: `a${Date.now()}` };
        set((s) => ({ addresses: [...s.addresses, addr] }));
        return addr;
      },

      removeAddress: (id) =>
        set((s) => ({ addresses: s.addresses.filter((a) => a.id !== id) })),

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