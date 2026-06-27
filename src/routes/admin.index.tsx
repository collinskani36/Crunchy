import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowUpRight, DollarSign, LogOut, Package, TrendingUp, Truck } from "lucide-react";
import { formatPrice } from "@/lib/utils";
import { STATUS_LABEL, type OrderStatus } from "@/lib/store";
import { supabase } from "@/lib/supabaseClient";

export const Route = createFileRoute("/admin/")({
  component: AdminDashboard,
});

type RecentOrder = {
  id: string;
  customer_name: string | null;
  status: OrderStatus;
  total: number;
};

type PopularFood = {
  id: string;
  name: string;
  price: number;
  rating: number | null;
  image_url: string | null;
};

type StatOrder = { total: number; status: string };
type RawOrder = { id: string; customer_name: string | null; status: string; total: number };

type DashboardData = {
  totalOrders: number;
  revenue: number;
  activeDeliveries: number;
  recentOrders: RecentOrder[];
  popularFoods: PopularFood[];
};

async function fetchDashboard(): Promise<DashboardData> {
  const [statsRes, recentRes, popularRes] = await Promise.all([
    supabase
      .from("orders")
      .select("total, status")
      .returns<StatOrder[]>(),

    supabase
      .from("orders")
      .select("id, customer_name, status, total")
      .order("created_at", { ascending: false })
      .limit(5)
      .returns<RawOrder[]>(),

    supabase
      .from("foods")
      .select("id, name, price, rating, image_url")
      .eq("is_popular", true)
      .eq("is_available", true)
      .order("rating", { ascending: false })
      .limit(5)
      .returns<PopularFood[]>(),
  ]);

  if (statsRes.error) throw statsRes.error;
  if (recentRes.error) throw recentRes.error;
  if (popularRes.error) throw popularRes.error;

  const allOrders = statsRes.data ?? [];
  const revenue = allOrders.reduce((s, o) => s + (o.total ?? 0), 0);
  const activeDeliveries = allOrders.filter(
    (o) => o.status === "out_for_delivery" || o.status === "ready"
  ).length;

  return {
    totalOrders: allOrders.length,
    revenue,
    activeDeliveries,
    recentOrders: (recentRes.data ?? []).map((o) => ({
      id: o.id,
      customer_name: o.customer_name,
      status: o.status as OrderStatus,
      total: o.total,
    })),
    popularFoods: popularRes.data ?? [],
  };
}

function AdminDashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.navigate({ to: "/" });
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        setData(await fetchDashboard());
      } catch (e: any) {
        setError(e.message ?? "Failed to load dashboard.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const revenue = data?.revenue ?? 0;
  const totalOrders = data?.totalOrders ?? 0;

  const stats = [
    { label: "Total orders", value: totalOrders.toString(), icon: Package, gradient: "bg-gradient-hero" },
    { label: "Revenue", value: formatPrice(revenue), icon: DollarSign, gradient: "bg-gradient-fresh" },
    { label: "Active deliveries", value: (data?.activeDeliveries ?? 0).toString(), icon: Truck, gradient: "bg-gradient-warm" },
    { label: "Avg. ticket", value: formatPrice(revenue / Math.max(1, totalOrders)), icon: TrendingUp, gradient: "bg-charcoal" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Welcome back, chef. Here's what's cooking.</p>
        </div>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-muted-foreground shadow-soft transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
          {loggingOut ? "Signing out…" : "Sign out"}
        </button>
      </div>

      {error && (
        <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className={`relative overflow-hidden rounded-3xl p-5 text-white shadow-card ${s.gradient}`}>
              <Icon className="h-6 w-6 opacity-80" />
              <p className="mt-4 text-3xl font-bold">
                {loading ? <span className="opacity-40">—</span> : s.value}
              </p>
              <p className="text-xs font-semibold uppercase tracking-wider opacity-80">{s.label}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="rounded-3xl bg-card p-6 shadow-soft">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-bold">Recent orders</h2>
            <Link to="/admin/orders" className="flex items-center gap-1 text-xs font-semibold text-primary">
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (data?.recentOrders.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No orders yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    <th className="pb-3">Order</th>
                    <th className="pb-3">Customer</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data!.recentOrders.map((o) => (
                    <tr key={o.id} className="border-t border-border">
                      <td className="py-3 font-mono text-xs font-semibold text-muted-foreground">
                        #{o.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="py-3 text-muted-foreground">{o.customer_name ?? "—"}</td>
                      <td className="py-3">
                        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                          {STATUS_LABEL[o.status]}
                        </span>
                      </td>
                      <td className="py-3 text-right font-bold">{formatPrice(o.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="rounded-3xl bg-card p-6 shadow-soft">
          <h2 className="mb-4 font-bold">Popular foods</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : (data?.popularFoods.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No popular items set.</p>
          ) : (
            <ul className="space-y-3">
              {data!.popularFoods.map((f, i) => (
                <li key={f.id} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-muted-foreground">#{i + 1}</span>
                  {f.image_url ? (
                    <img src={f.image_url} alt={f.name} className="h-10 w-10 rounded-xl object-cover" />
                  ) : (
                    <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-lg">🍽️</div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 text-sm font-semibold">{f.name}</p>
                    <p className="text-xs text-muted-foreground">{formatPrice(f.price)}</p>
                  </div>
                  {f.rating != null && (
                    <span className="text-xs font-bold text-primary">★ {f.rating}</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}