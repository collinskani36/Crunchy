import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { formatPrice } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";

// ── constants ─────────────────────────────────────────────────────────────────

const LS_KEY = "crunchyinn_order_ids";

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "out_for_delivery"
  | "delivered";

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  preparing: "Preparing",
  ready: "Ready",
  out_for_delivery: "On the way",
  delivered: "Delivered",
};

const statusColor: Record<OrderStatus, string> = {
  pending: "bg-amber-500/15 text-amber-600",
  confirmed: "bg-sky-500/15 text-sky-600",
  preparing: "bg-orange-500/15 text-orange-600",
  ready: "bg-violet-500/15 text-violet-600",
  out_for_delivery: "bg-primary/15 text-primary",
  delivered: "bg-emerald-500/15 text-emerald-600",
};

// progress bar fill % per status
const STATUS_PROGRESS: Record<OrderStatus, number> = {
  pending: 10,
  confirmed: 28,
  preparing: 50,
  ready: 70,
  out_for_delivery: 88,
  delivered: 100,
};

const progressBarColor: Record<OrderStatus, string> = {
  pending: "bg-amber-500",
  confirmed: "bg-sky-500",
  preparing: "bg-orange-500",
  ready: "bg-violet-500",
  out_for_delivery: "bg-primary",
  delivered: "bg-emerald-500",
};

// ── DB type ───────────────────────────────────────────────────────────────────

type DbOrder = {
  id: string;
  status: OrderStatus;
  total: number;
  created_at: string;
  order_items: { food_name: string; quantity: number }[];
};

// ── helpers ───────────────────────────────────────────────────────────────────

function getSavedIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function mergeOrders(a: DbOrder[], b: DbOrder[]): DbOrder[] {
  const seen = new Set<string>();
  return [...a, ...b].filter((o) => {
    if (seen.has(o.id)) return false;
    seen.add(o.id);
    return true;
  });
}

// ── route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/orders")({
  head: () => ({ meta: [{ title: "Your orders — Crunchy Inn" }] }),
  component: OrdersPage,
});

const ORDER_SELECT = `
  id,
  status,
  total,
  created_at,
  order_items ( food_name, quantity )
`;

function OrdersPage() {
  const [orders, setOrders] = useState<DbOrder[]>([]);
  const [loading, setLoading] = useState(true);

  const [phone, setPhone] = useState("");
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  // ── load orders saved in localStorage on mount ────────────────────────────
  useEffect(() => {
    async function loadSaved() {
      const ids = getSavedIds();
      if (ids.length === 0) { setLoading(false); return; }

      const { data } = await supabase
        .from("orders")
        .select(ORDER_SELECT)
        .in("id", ids)
        .order("created_at", { ascending: false });

      setOrders((data as DbOrder[]) ?? []);
      setLoading(false);
    }
    loadSaved();
  }, []);

  // ── phone lookup ──────────────────────────────────────────────────────────
  async function lookupByPhone() {
    if (!phone.trim()) return;
    setSearching(true);

    const { data } = await supabase
      .from("orders")
      .select(ORDER_SELECT)
      .eq("customer_phone", phone.trim())
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      const existingIds = getSavedIds();
      const merged = Array.from(new Set([...existingIds, ...(data as DbOrder[]).map((o) => o.id)]));
      localStorage.setItem(LS_KEY, JSON.stringify(merged));
      setOrders((prev) => mergeOrders(prev, data as DbOrder[]));
    }

    setSearching(false);
    setSearched(true);
  }

  const active = orders.filter((o) => o.status !== "delivered");
  const past = orders.filter((o) => o.status === "delivered");

  return (
    <PageShell>
      <h1 className="mb-6 text-3xl font-bold md:text-4xl">Your orders</h1>

      {/* Phone lookup */}
      <div className="mb-8 rounded-3xl bg-card p-5 shadow-soft">
        <p className="mb-3 text-sm font-semibold">Look up orders by phone number</p>
        <div className="flex gap-2">
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && lookupByPhone()}
            placeholder="+254 700 000 000"
            className="flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
          />
          <button
            type="button"
            onClick={lookupByPhone}
            disabled={searching}
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground transition-smooth hover:bg-primary/90 disabled:opacity-60"
          >
            <Search className="h-4 w-4" />
            {searching ? "Searching…" : "Search"}
          </button>
        </div>
        {searched && orders.length === 0 && (
          <p className="mt-2 text-xs text-muted-foreground">No orders found for that number.</p>
        )}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">Active</h2>
              <div className="space-y-3">
                {active.map((o) => <OrderRow key={o.id} order={o} />)}
              </div>
            </section>
          )}

          <section>
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">Past orders</h2>
            {past.length === 0 ? (
              <p className="rounded-3xl bg-card p-8 text-center text-sm text-muted-foreground shadow-soft">
                {orders.length === 0
                  ? "Enter your phone number above to find your orders."
                  : "No past orders yet."}
              </p>
            ) : (
              <div className="space-y-3">
                {past.map((o) => <OrderRow key={o.id} order={o} />)}
              </div>
            )}
          </section>
        </>
      )}
    </PageShell>
  );
}

// ── order row with inline progress bar ───────────────────────────────────────

function OrderRow({ order }: { order: DbOrder }) {
  const color = statusColor[order.status] ?? "bg-muted text-muted-foreground";
  const label = STATUS_LABEL[order.status] ?? order.status;
  const barColor = progressBarColor[order.status] ?? "bg-primary";
  const progress = STATUS_PROGRESS[order.status] ?? 0;
  const isDelivered = order.status === "delivered";
  const itemSummary = order.order_items
    .map((i) => `${i.quantity}× ${i.food_name}`)
    .join(", ");

  return (
    <Link
      to="/orders/$orderId"
      params={{ orderId: order.id }}
      className="block rounded-2xl bg-card p-4 shadow-soft transition-smooth hover:-translate-y-0.5 hover:shadow-card"
    >
      {/* top row */}
      <div className="flex items-center gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-2xl">
          🍽️
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-bold">{order.id.slice(0, 8)}…</p>
            <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${color}`}>
              {label}
            </span>
          </div>
          <p className="line-clamp-1 text-sm text-muted-foreground">{itemSummary}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className="font-bold">{formatPrice(order.total)}</p>
          <p className="text-xs text-muted-foreground">
            {new Date(order.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* inline progress bar */}
      <div className="mt-3">
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
          <div
            className={`h-full rounded-full transition-all duration-700 ${barColor}`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
          <span>Placed</span>
          <span>Preparing</span>
          <span>On the way</span>
          <span className={isDelivered ? "font-bold text-emerald-600" : ""}>Delivered</span>
        </div>
      </div>
    </Link>
  );
}