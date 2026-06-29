import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ChevronDown, ChevronUp, Phone, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { formatPrice } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";
import { STATUS_LABEL, STATUS_FLOW, type OrderStatus } from "@/lib/store";

// ── constants ─────────────────────────────────────────────────────────────────

export const LS_KEY = "crunchyinn_order_ids";

const statusColor: Record<OrderStatus, string> = {
  pending: "bg-amber-500/15 text-amber-600",
  confirmed: "bg-sky-500/15 text-sky-600",
  preparing: "bg-orange-500/15 text-orange-600",
  ready: "bg-violet-500/15 text-violet-600",
  out_for_delivery: "bg-primary/15 text-primary",
  delivered: "bg-emerald-500/15 text-emerald-600",
  cancelled: "bg-destructive/15 text-destructive",
};

const progressBarColor: Record<OrderStatus, string> = {
  pending: "bg-amber-500",
  confirmed: "bg-sky-500",
  preparing: "bg-orange-500",
  ready: "bg-violet-500",
  out_for_delivery: "bg-primary",
  delivered: "bg-emerald-500",
  cancelled: "bg-destructive",
};

function getProgress(status: OrderStatus): number {
  if (status === "cancelled") return 0;
  const idx = STATUS_FLOW.indexOf(status);
  if (idx === -1) return 0;
  return Math.round((idx / (STATUS_FLOW.length - 1)) * 100);
}

// ── DB types ──────────────────────────────────────────────────────────────────

export type DbRider = {
  id: string;
  name: string;
  phone: string;
};

export type DbOrder = {
  id: string;
  status: OrderStatus;
  total: number;
  created_at: string;
  rider_id: string | null;
  order_items: { food_name: string; quantity: number }[];
};

// ── helpers ───────────────────────────────────────────────────────────────────

export function getSavedIds(): string[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function mergeOrders(a: DbOrder[], b: DbOrder[]): DbOrder[] {
  const seen = new Set<string>();
  return [...a, ...b].filter((o) => {
    if (seen.has(o.id)) return false;
    seen.add(o.id);
    return true;
  });
}

export const ORDER_SELECT = `
  id,
  status,
  total,
  created_at,
  rider_id,
  order_items ( food_name, quantity )
`;

export async function fetchRidersForOrders(
  orderList: DbOrder[]
): Promise<Record<string, DbRider>> {
  const riderIds = [
    ...new Set(orderList.map((o) => o.rider_id).filter(Boolean) as string[]),
  ];
  if (riderIds.length === 0) return {};

  const { data } = await (supabase as any)
    .from("riders")
    .select("id, name, phone")
    .in("id", riderIds);

  if (!data) return {};
  return Object.fromEntries((data as DbRider[]).map((r) => [r.id, r]));
}

// ── route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/orders")({
  head: () => ({ meta: [{ title: "Your orders — Crunchy Inn" }] }),
  component: OrdersPage,
});

function OrdersPage() {
  const [orders, setOrders] = useState<DbOrder[]>([]);
  const [riders, setRiders] = useState<Record<string, DbRider>>({});
  const [loading, setLoading] = useState(true);

  const [phone, setPhone] = useState("");
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [lookupOpen, setLookupOpen] = useState(false);

  // ── Load from localStorage IDs on mount ───────────────────────────────────
  useEffect(() => {
    async function loadSaved() {
      const ids = getSavedIds();
      if (ids.length === 0) {
        setLoading(false);
        return;
      }
      const { data } = await (supabase as any)
        .from("orders")
        .select(ORDER_SELECT)
        .in("id", ids)
        .order("created_at", { ascending: false });

      const loaded = (data as DbOrder[]) ?? [];
      setOrders(loaded);
      setLoading(false);
      const riderMap = await fetchRidersForOrders(loaded);
      setRiders(riderMap);
    }
    loadSaved();
  }, []);

  // ── Real-time subscription ─────────────────────────────────────────────────
  useEffect(() => {
    const ids = getSavedIds();
    if (ids.length === 0) return;

    const channel = supabase
      .channel("customer-orders-realtime")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        async (payload) => {
          const updated = payload.new as any;
          if (!ids.includes(updated.id)) return;

          setOrders((prev) =>
            prev.map((o) =>
              o.id === updated.id
                ? { ...o, status: updated.status as OrderStatus, rider_id: updated.rider_id ?? null }
                : o
            )
          );

          if (updated.rider_id) {
            const { data } = await (supabase as any)
              .from("riders")
              .select("id, name, phone")
              .eq("id", updated.rider_id)
              .single();
            if (data) {
              setRiders((prev) => ({ ...prev, [(data as DbRider).id]: data as DbRider }));
            }
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // ── Phone lookup ──────────────────────────────────────────────────────────
  async function lookupByPhone() {
    if (!phone.trim()) return;
    setSearching(true);

    const { data } = await (supabase as any)
      .from("orders")
      .select(ORDER_SELECT)
      .eq("customer_phone", phone.trim())
      .order("created_at", { ascending: false });

    if (data && (data as DbOrder[]).length > 0) {
      const existingIds = getSavedIds();
      const merged = Array.from(
        new Set([...existingIds, ...(data as DbOrder[]).map((o) => o.id)])
      );
      localStorage.setItem(LS_KEY, JSON.stringify(merged));
      const newOrders = data as DbOrder[];
      setOrders((prev) => mergeOrders(prev, newOrders));
      const riderMap = await fetchRidersForOrders(newOrders);
      setRiders((prev) => ({ ...prev, ...riderMap }));
    }

    setSearching(false);
    setSearched(true);
  }

  const active = orders.filter((o) => o.status !== "delivered" && o.status !== "cancelled");
  const past = orders.filter((o) => o.status === "delivered" || o.status === "cancelled");

  return (
    <PageShell>
      <h1 className="mb-6 text-3xl font-bold md:text-4xl">Your orders</h1>

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
                {active.map((o) => (
                  <OrderRow key={o.id} order={o} rider={o.rider_id ? riders[o.rider_id] : undefined} />
                ))}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section className="mb-10">
              <h2 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted-foreground">Past orders</h2>
              <div className="space-y-3">
                {past.map((o) => (
                  <OrderRow key={o.id} order={o} rider={o.rider_id ? riders[o.rider_id] : undefined} />
                ))}
              </div>
            </section>
          )}

          {orders.length === 0 && (
            <div className="rounded-3xl bg-card p-10 text-center shadow-soft">
              <p className="text-2xl">🍽️</p>
              <p className="mt-2 font-semibold">No orders yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Place an order and it will appear here automatically.</p>
            </div>
          )}

          {/* Phone lookup — collapsed by default */}
          <div className="mt-6 rounded-3xl bg-card shadow-soft overflow-hidden">
            <button
              type="button"
              onClick={() => setLookupOpen((v) => !v)}
              className="flex w-full items-center justify-between px-5 py-4 text-sm font-semibold transition-smooth hover:bg-muted/40"
            >
              <span>Find orders on another device?</span>
              {lookupOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </button>

            {lookupOpen && (
              <div className="border-t border-border px-5 pb-5 pt-4">
                <p className="mb-3 text-xs text-muted-foreground">
                  Enter the phone number you used when ordering to find your order history.
                </p>
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
            )}
          </div>
        </>
      )}
    </PageShell>
  );
}

// ── Shared OrderRow (also exported for use in account.tsx) ────────────────────

export function OrderRow({ order, rider }: { order: DbOrder; rider?: DbRider }) {
  const navigate = useNavigate();
  const color = statusColor[order.status] ?? "bg-muted text-muted-foreground";
  const label = STATUS_LABEL[order.status] ?? order.status;
  const barColor = progressBarColor[order.status] ?? "bg-primary";
  const progress = getProgress(order.status);
  const isDelivered = order.status === "delivered";
  const isCancelled = order.status === "cancelled";
  const isOutForDelivery = order.status === "out_for_delivery";

  const itemSummary = order.order_items.map((i) => `${i.quantity}× ${i.food_name}`).join(", ");

  return (
    <div
      onClick={() => navigate({ to: "/orders/$orderId", params: { orderId: order.id } })}
      className="block cursor-pointer rounded-2xl bg-card p-4 shadow-soft transition-smooth hover:-translate-y-0.5 hover:shadow-card"
    >
      <div className="flex items-center gap-4">
        <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/10 text-2xl">🍽️</div>
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
          <p className="text-xs text-muted-foreground">{new Date(order.created_at).toLocaleDateString()}</p>
        </div>
      </div>

      {!isCancelled && (
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
      )}

      {isOutForDelivery && rider && (
        <div className="mt-3 flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary/15 text-sm font-bold text-primary">
            {rider.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-foreground">{rider.name}</p>
            <p className="text-[11px] text-muted-foreground">Your delivery rider</p>
          </div>
          <a
            href={`tel:${rider.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-[11px] font-bold text-primary-foreground transition-smooth hover:bg-primary/90"
          >
            <Phone className="h-3 w-3" />
            Call
          </a>
        </div>
      )}

      {isCancelled && (
        <p className="mt-2 text-xs text-destructive">This order was cancelled.</p>
      )}
    </div>
  );
}