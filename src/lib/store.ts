import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// Define the Food type from your database
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

// ── All statuses must match exactly what admin writes to Supabase ─────────────
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
  name: string;
  email: string;
  phone?: string;
};

type State = {
  user: User | null;
  cart: CartItem[];
  favorites: string[];
  addresses: Address[];
  orders: Order[];
  login: (email: string, name?: string) => void;
  logout: () => void;
  addToCart: (food: Food, qty?: number) => void;
  removeFromCart: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clearCart: () => void;
  toggleFavorite: (id: string) => void;
  addAddress: (a: Omit<Address, "id">) => Address;
  removeAddress: (id: string) => void;
  placeOrder: (input: {
    address: Address;
    customerName: string;
    customerPhone: string;
  }) => Order;
  updateOrderStatus: (id: string, status: OrderStatus) => void;
};

const DELIVERY_FEE = 150; // KES

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      user: null,
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

      login: (email, name) =>
        set({ user: { email, name: name ?? email.split("@")[0] } }),
      logout: () => set({ user: null, cart: [] }),

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

      toggleFavorite: (id) =>
        set((s) => ({
          favorites: s.favorites.includes(id)
            ? s.favorites.filter((f) => f !== id)
            : [...s.favorites, id],
        })),

      addAddress: (a) => {
        const addr: Address = { ...a, id: `a${Date.now()}` };
        set((s) => ({ addresses: [...s.addresses, addr] }));
        return addr;
      },

      removeAddress: (id) =>
        set((s) => ({ addresses: s.addresses.filter((a) => a.id !== id) })),

      // ── placeOrder: inserts into Supabase, no mock simulation ──────────────
      // Status progression is driven entirely by admin via Supabase.
      // The customer page polls / subscribes to live DB updates.
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
        // Store the order locally so the orders list page shows it immediately,
        // but the source of truth for status is always Supabase.
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
        cart: s.cart,
        favorites: s.favorites,
        addresses: s.addresses,
        orders: s.orders,
      }),
    }
  )
);

export const DELIVERY = DELIVERY_FEE;