import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, LogOut, MapPin, Package, Settings, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { FoodCard } from "@/components/FoodCard";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabaseClient";
import {
  OrderRow,
  getSavedIds,
  mergeOrders,
  fetchRidersForOrders,
  ORDER_SELECT,
  LS_KEY,
  type DbOrder,
  type DbRider,
} from "./orders";

export const Route = createFileRoute("/account")({
  head: () => ({ meta: [{ title: "Account — Crunchy Inn" }] }),
  component: AccountPage,
});

const tabs = [
  { id: "orders", label: "Orders", icon: Package },
  { id: "addresses", label: "Addresses", icon: MapPin },
  { id: "favorites", label: "Favorites", icon: Heart },
  { id: "settings", label: "Settings", icon: Settings },
] as const;

// Food type matching what Supabase returns
type DbFood = {
  id: string;
  name: string;
  description: string;
  price: number;
  category_id: string;
  image_url: string | null;
  rating: number | null;
  prep_time: string | null;
  is_popular: boolean;
  is_available: boolean;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
  // Derived client-side
  emoji: string;
  gradient: string;
};

function AccountPage() {
  const user = useStore((s) => s.user);
  const logout = useStore((s) => s.logout);
  const addresses = useStore((s) => s.addresses);
  const removeAddress = useStore((s) => s.removeAddress);
  const addAddress = useStore((s) => s.addAddress);
  const favIds = useStore((s) => s.favorites);
  const setFavorites = useStore((s) => s.setFavorites);
  const setCustomerProfileId = useStore((s) => s.setCustomerProfileId);

  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("orders");
  const [newAddr, setNewAddr] = useState({ label: "", line1: "", city: "" });

  // ── Orders state ──────────────────────────────────────────────────────────
  const [orders, setOrders] = useState<DbOrder[]>([]);
  const [riders, setRiders] = useState<Record<string, DbRider>>({});
  const [ordersLoading, setOrdersLoading] = useState(true);

  // ── Favorites: fetched from Supabase, no static data dependency ───────────
  const [favFoods, setFavFoods] = useState<DbFood[]>([]);
  const [favsLoading, setFavsLoading] = useState(false);

  const displayName = user?.name ?? "Guest";
  const displayEmail = user?.email ?? "Sign in to sync your data";

  // ── Fetch food details for a list of food IDs from Supabase ──────────────
  async function fetchFoodsByIds(ids: string[]): Promise<DbFood[]> {
    if (ids.length === 0) return [];
    const { data } = await supabase
      .from("foods")
      .select(
        "id, name, description, price, category_id, image_url, rating, prep_time, is_popular, is_available, tags, created_at, updated_at"
      )
      .in("id", ids);

    return (data ?? []).map((f: any) => ({
      ...f,
      rating: f.rating ?? 0,
      tags: f.tags ?? [],
      // Fallback emoji/gradient — FoodCard uses image_url when available
      emoji: "🍽️",
      gradient: "from-amber-400 to-orange-500",
    }));
  }

  // ── On mount / user change: fetch profile, favorites, orders ──────────────
  useEffect(() => {
    async function bootstrap() {
      setOrdersLoading(true);
      setFavsLoading(true);

      // 1. Fetch customer_profile for signed-in user
      let profileId: string | null = null;
      if (user?.id) {
        const { data: profile } = await supabase
          .from("customer_profiles")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (profile) {
          profileId = (profile as any).id;
          setCustomerProfileId(profileId);
        }
      }

      // 2. Resolve favorites
      if (profileId) {
        // Signed in: fetch from customer_favorites
        const { data: favRows } = await supabase
          .from("customer_favorites")
          .select("food_id")
          .eq("customer_profile_id", profileId);

        const supabaseIds = (favRows ?? []).map((r: any) => r.food_id as string);

        // Union with any local IDs (e.g. favorited while not signed in)
        const mergedIds = Array.from(new Set([...favIds, ...supabaseIds]));

        // Push any local-only favorites up to Supabase
        const localOnlyIds = favIds.filter((id) => !supabaseIds.includes(id));
        if (localOnlyIds.length > 0) {
          await supabase.from("customer_favorites").insert(
            localOnlyIds.map((food_id) => ({
              customer_profile_id: profileId!,
              food_id,
            })) as any
          );
        }

        setFavorites(mergedIds);
        const foods = await fetchFoodsByIds(mergedIds);
        setFavFoods(foods);
      } else {
        // Guest: fetch food details for local favorite IDs
        const foods = await fetchFoodsByIds(favIds);
        setFavFoods(foods);
      }

      setFavsLoading(false);

      // 3. Load orders from localStorage IDs
      const ids = getSavedIds();
      let fetched: DbOrder[] = [];

      if (ids.length > 0) {
        const { data } = await supabase
          .from("orders")
          .select(ORDER_SELECT)
          .in("id", ids)
          .order("created_at", { ascending: false });
        fetched = (data as DbOrder[]) ?? [];
      }

      // 4. Also load orders linked to customer_profile if signed in
      if (profileId) {
        const { data: profileOrders } = await supabase
          .from("orders")
          .select(ORDER_SELECT)
          .eq("customer_id", profileId)
          .order("created_at", { ascending: false });

        if (profileOrders && profileOrders.length > 0) {
          const newIds = (profileOrders as DbOrder[]).map((o) => o.id);
          const mergedIds = Array.from(new Set([...ids, ...newIds]));
          localStorage.setItem(LS_KEY, JSON.stringify(mergedIds));
          fetched = mergeOrders(fetched, profileOrders as DbOrder[]);
        }
      }

      setOrders(fetched);
      const riderMap = await fetchRidersForOrders(fetched);
      setRiders(riderMap);
      setOrdersLoading(false);
    }

    bootstrap();
  }, [user?.id]);

  // ── Keep favFoods in sync when favIds changes (heart toggled elsewhere) ───
  useEffect(() => {
    // Add foods for newly favorited IDs not yet in favFoods
    const currentIds = favFoods.map((f) => f.id);
    const addedIds = favIds.filter((id) => !currentIds.includes(id));
    const removedIds = currentIds.filter((id) => !favIds.includes(id));

    if (removedIds.length > 0) {
      setFavFoods((prev) => prev.filter((f) => !removedIds.includes(f.id)));
    }

    if (addedIds.length > 0) {
      fetchFoodsByIds(addedIds).then((newFoods) => {
        setFavFoods((prev) => {
          const existingIds = new Set(prev.map((f) => f.id));
          const unique = newFoods.filter((f) => !existingIds.has(f.id));
          return [...prev, ...unique];
        });
      });
    }
  }, [favIds]);

  // ── Real-time order updates ───────────────────────────────────────────────
  useEffect(() => {
    const ids = getSavedIds();
    if (ids.length === 0) return;

    const channel = supabase
      .channel("account-orders-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        async (payload) => {
          const updated = payload.new as any;
          if (!ids.includes(updated.id)) return;

          setOrders((prev) =>
            prev.map((o) =>
              o.id === updated.id
                ? { ...o, status: updated.status, rider_id: updated.rider_id ?? null }
                : o
            )
          );

          if (updated.rider_id) {
            setRiders((prev) => {
              if (prev[updated.rider_id]) return prev;
              return prev;
            });
            const { data } = await supabase
              .from("riders")
              .select("id, name, phone")
              .eq("id", updated.rider_id)
              .single();
            if (data) {
              const rider = data as DbRider;
              setRiders((prev) => ({ ...prev, [rider.id]: rider }));
            }
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <PageShell>
      {/* Profile header */}
      <div className="mb-8 flex items-center gap-4 rounded-3xl bg-gradient-hero p-6 text-white shadow-card">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/20 text-2xl font-bold">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{displayName}</h1>
          <p className="text-sm text-white/80">{displayEmail}</p>
        </div>
        {user ? (
          <button
            onClick={logout}
            className="grid h-10 w-10 place-items-center rounded-full bg-white/15 transition-smooth hover:bg-white/25"
            aria-label="Logout"
          >
            <LogOut className="h-4 w-4" />
          </button>
        ) : (
          <Link to="/login" className="rounded-full bg-white px-4 py-2 text-sm font-bold text-primary">
            Sign in
          </Link>
        )}
      </div>

      {/* Tab bar */}
      <div className="scrollbar-hide mb-6 flex gap-2 overflow-x-auto">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-smooth ${
                active
                  ? "bg-charcoal text-charcoal-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {/* Orders tab */}
      {tab === "orders" && (
        <div>
          {ordersLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="rounded-3xl bg-card p-10 text-center shadow-soft">
              <p className="text-2xl">🍽️</p>
              <p className="mt-2 font-semibold">No orders yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Your orders will appear here after you place one.
              </p>
              <Link
                to="/menu"
                className="mt-4 inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-glow transition-smooth hover:-translate-y-0.5"
              >
                Browse menu
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => (
                <OrderRow
                  key={o.id}
                  order={o}
                  rider={o.rider_id ? riders[o.rider_id] : undefined}
                />
              ))}
              <Link
                to="/orders"
                className="mt-2 block text-center text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                View full order history →
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Addresses tab */}
      {tab === "addresses" && (
        <div className="space-y-3">
          {addresses.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-2xl bg-card p-4 shadow-soft">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
                  <MapPin className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-bold">{a.label}</p>
                  <p className="text-sm text-muted-foreground">{a.line1}, {a.city}</p>
                </div>
              </div>
              <button
                onClick={() => removeAddress(a.id)}
                className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-smooth hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newAddr.line1) return;
              addAddress({ label: newAddr.label || "Other", line1: newAddr.line1, city: newAddr.city || "Nairobi" });
              setNewAddr({ label: "", line1: "", city: "" });
            }}
            className="rounded-2xl border-2 border-dashed border-border p-4"
          >
            <p className="mb-3 font-semibold">Add new address</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <input
                value={newAddr.label}
                onChange={(e) => setNewAddr({ ...newAddr, label: e.target.value })}
                placeholder="Label (e.g. Home)"
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
              />
              <input
                value={newAddr.line1}
                onChange={(e) => setNewAddr({ ...newAddr, line1: e.target.value })}
                placeholder="Address"
                className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none sm:col-span-2"
                required
              />
            </div>
            <button className="mt-3 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground transition-smooth hover:-translate-y-0.5">
              Save address
            </button>
          </form>
        </div>
      )}

      {/* Favorites tab */}
      {tab === "favorites" && (
        favsLoading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-56 animate-pulse rounded-3xl bg-muted" />
            ))}
          </div>
        ) : favFoods.length === 0 ? (
          <div className="rounded-3xl bg-card p-10 text-center shadow-soft">
            <p className="text-5xl">❤️</p>
            <p className="mt-3 font-semibold">No favorites yet</p>
            <p className="text-sm text-muted-foreground">Tap the heart on any dish to save it.</p>
            <Link
              to="/menu"
              className="mt-4 inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-bold text-primary-foreground shadow-glow transition-smooth hover:-translate-y-0.5"
            >
              Browse menu
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {favFoods.map((f) => <FoodCard key={f.id} food={f as any} />)}
          </div>
        )
      )}

      {/* Settings tab */}
      {tab === "settings" && (
        <div className="rounded-3xl bg-card p-6 shadow-soft">
          <p className="font-semibold">Profile</p>
          <p className="mt-2 text-sm text-muted-foreground">Email: {displayEmail}</p>
          <p className="text-sm text-muted-foreground">Name: {displayName}</p>
          <div className="mt-4 flex gap-2">
            {user ? (
              <button
                onClick={logout}
                className="rounded-full bg-destructive/10 px-4 py-2 text-sm font-bold text-destructive"
              >
                Sign out
              </button>
            ) : (
              <Link
                to="/login"
                className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
              >
                Sign in
              </Link>
            )}
          </div>
        </div>
      )}
    </PageShell>
  );
}