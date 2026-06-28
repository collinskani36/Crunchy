import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { formatPrice } from "@/lib/utils";
import { STATUS_FLOW, STATUS_LABEL, type OrderStatus } from "@/lib/store";
import { supabase } from "@/lib/supabaseClient";

export const Route = createFileRoute("/admin/orders")({
  component: AdminOrders,
});

type OrderItem = {
  food_name: string;
  food_price: number;
  quantity: number;
};

type OrderRow = {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: OrderStatus;
  item_count: number;
  created_at: string;
  rider_id: string | null;
  delivery_address: string | null;
  order_items: OrderItem[];
};

type Rider = {
  id: string;
  name: string;
  phone: string;
  is_online: boolean;
  is_active: boolean;
  rating: number | null;
};

type SupabaseOrderRow = {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  status: string;
  created_at: string;
  rider_id: string | null;
  delivery_address: string | null;
  order_items: { food_name: string; food_price: number; quantity: number }[];
};

type SupabaseRiderRow = {
  id: string;
  name: string;
  phone: string;
  is_online: boolean;
  is_active: boolean;
  rating: number | null;
};

const STATUS_STEPS: OrderStatus[] = [
  "pending",
  "confirmed",
  "preparing",
  "ready",
  "out_for_delivery",
  "delivered",
];

const STATUS_COLORS: Record<OrderStatus, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  preparing: "bg-violet-100 text-violet-800 border-violet-200",
  ready: "bg-cyan-100 text-cyan-800 border-cyan-200",
  out_for_delivery: "bg-indigo-100 text-indigo-800 border-indigo-200",
  delivered: "bg-emerald-100 text-emerald-800 border-emerald-200",
  cancelled: "bg-red-100 text-red-800 border-red-200",
};

function getProgressPercent(status: OrderStatus): number {
  const idx = STATUS_STEPS.indexOf(status);
  if (idx < 0) return 0;
  return Math.round(((idx + 1) / STATUS_STEPS.length) * 100);
}

function getProgressColor(status: OrderStatus): string {
  if (status === "delivered") return "bg-emerald-500";
  if (status === "cancelled") return "bg-red-400";
  if (status === "out_for_delivery") return "bg-indigo-500";
  if (status === "ready") return "bg-cyan-500";
  if (status === "preparing") return "bg-violet-500";
  if (status === "confirmed") return "bg-blue-500";
  return "bg-amber-400";
}

async function fetchOrders(): Promise<OrderRow[]> {
  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      customer_name,
      customer_phone,
      subtotal,
      delivery_fee,
      total,
      status,
      created_at,
      rider_id,
      delivery_address,
      order_items(food_name, food_price, quantity)
    `)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as SupabaseOrderRow[]).map((o) => {
    const items = Array.isArray(o.order_items) ? o.order_items : [];
    const derivedSubtotal =
      o.subtotal ?? items.reduce((sum, i) => sum + i.food_price * i.quantity, 0);
    const derivedDeliveryFee =
      o.delivery_fee ?? (o.total - derivedSubtotal);
    return {
      id: o.id,
      customer_name: o.customer_name,
      customer_phone: o.customer_phone,
      subtotal: derivedSubtotal,
      delivery_fee: derivedDeliveryFee,
      total: o.total,
      status: o.status as OrderStatus,
      created_at: o.created_at,
      item_count: items.length,
      rider_id: o.rider_id ?? null,
      delivery_address: o.delivery_address ?? null,
      order_items: items,
    };
  });
}

async function fetchRiders(): Promise<Rider[]> {
  const { data, error } = await supabase
    .from("riders")
    .select("id, name, phone, is_online, is_active, rating")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as SupabaseRiderRow[]).map((r) => ({
    id: r.id,
    name: r.name,
    phone: r.phone,
    is_online: r.is_online,
    is_active: r.is_active,
    rating: r.rating,
  }));
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString([], { month: "short", day: "numeric" });
}

function ProgressBar({ status }: { status: OrderStatus }) {
  const pct = getProgressPercent(status);
  const color = getProgressColor(status);
  const isCancelled = status === "cancelled";

  return (
    <div className="mt-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {isCancelled ? "Cancelled" : `${pct}% complete`}
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${color} ${
            isCancelled ? "opacity-40" : ""
          }`}
          style={{ width: `${isCancelled ? 100 : pct}%` }}
        />
      </div>
      {!isCancelled && (
        <div className="flex justify-between mt-1.5">
          {STATUS_STEPS.map((step, i) => {
            const stepIdx = STATUS_STEPS.indexOf(status);
            const done = i <= stepIdx;
            return (
              <div
                key={step}
                className={`h-1 w-1 rounded-full transition-all duration-500 ${
                  done ? color.replace("bg-", "bg-") : "bg-border"
                }`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function RiderBadge({ rider, riders }: { rider: Rider | null | undefined; riders: Rider[] }) {
  if (!rider) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground italic">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        Unassigned
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      <span
        className={`inline-block h-2 w-2 rounded-full ${rider.is_online ? "bg-emerald-500" : "bg-gray-300"}`}
      />
      {rider.name}
    </span>
  );
}

// Inline rider picker panel — slides open inside the order card
function RiderPickerPanel({
  riders,
  selectedRiderId,
  onSelect,
  isAssigning,
}: {
  riders: Rider[];
  selectedRiderId: string | null;
  onSelect: (riderId: string) => void;
  isAssigning: boolean;
}) {
  const onlineRiders = riders.filter((r) => r.is_online);
  const offlineRiders = riders.filter((r) => !r.is_online);

  return (
    <div className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50/40 overflow-hidden">
      {/* Panel header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-indigo-200/60 bg-indigo-50/60">
        <svg className="w-3.5 h-3.5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600">
          Select rider for delivery
        </span>
        {isAssigning && (
          <svg className="w-3.5 h-3.5 animate-spin text-indigo-400 ml-auto" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
        )}
      </div>

      <div className="p-3 space-y-3 max-h-64 overflow-y-auto">
        {/* Online riders */}
        {onlineRiders.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Available ({onlineRiders.length})
              </span>
            </div>
            <div className="space-y-1.5">
              {onlineRiders.map((rider) => {
                const isSelected = selectedRiderId === rider.id;
                return (
                  <button
                    key={rider.id}
                    onClick={() => onSelect(rider.id)}
                    disabled={isAssigning}
                    className={`w-full group flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${
                      isSelected
                        ? "border-emerald-500 bg-emerald-50 shadow-sm"
                        : "border-border bg-background hover:border-emerald-400/60 hover:bg-emerald-50/40"
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isSelected ? "bg-emerald-500" : "bg-emerald-100"}`}>
                        <span className={`text-xs font-bold ${isSelected ? "text-white" : "text-emerald-700"}`}>
                          {rider.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-background" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className={`text-sm font-semibold truncate ${isSelected ? "text-emerald-700" : ""}`}>
                        {rider.name}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-muted-foreground">{rider.phone}</span>
                        {rider.rating != null && (
                          <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-amber-600">
                            <svg className="w-2.5 h-2.5 fill-current" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            {rider.rating.toFixed(1)}
                          </span>
                        )}
                      </div>
                    </div>
                    {isSelected ? (
                      <svg className="w-4 h-4 text-emerald-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-muted-foreground group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Offline riders */}
        {offlineRiders.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <div className="h-1.5 w-1.5 rounded-full bg-gray-300" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Offline ({offlineRiders.length})
              </span>
            </div>
            <div className="space-y-1.5 opacity-60">
              {offlineRiders.map((rider) => {
                const isSelected = selectedRiderId === rider.id;
                return (
                  <button
                    key={rider.id}
                    onClick={() => onSelect(rider.id)}
                    disabled={isAssigning}
                    className={`w-full group flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all duration-150 disabled:cursor-not-allowed ${
                      isSelected
                        ? "border-gray-400 bg-secondary shadow-sm"
                        : "border-border bg-background hover:border-border-strong"
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                        <span className="text-xs font-bold text-muted-foreground">
                          {rider.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-gray-300 border-2 border-background" />
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-sm font-semibold truncate">{rider.name}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{rider.phone}</p>
                    </div>
                    {isSelected ? (
                      <svg className="w-4 h-4 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-muted-foreground shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Empty */}
        {riders.length === 0 && (
          <div className="text-center py-5">
            <p className="text-sm font-semibold text-muted-foreground">No active riders</p>
            <p className="text-xs text-muted-foreground mt-1">Add riders to your team first</p>
          </div>
        )}
      </div>
    </div>
  );
}


function AdminOrders() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<OrderStatus | "all">("all");
  const [riderPickerOrderId, setRiderPickerOrderId] = useState<string | null>(null); // orderId showing inline rider picker
  const [assigningRider, setAssigningRider] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [orderRows, riderRows] = await Promise.all([fetchOrders(), fetchRiders()]);
      setOrders(orderRows);
      setRiders(riderRows);
    } catch (e: any) {
      setError(e.message ?? "Failed to load data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();

    // Real-time subscription on orders table
    const channel = supabase
      .channel("admin-orders-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => {
          if (payload.eventType === "UPDATE") {
            const updated = payload.new as any;
            setOrders((prev) =>
              prev.map((o) =>
                o.id === updated.id
                  ? {
                      ...o,
                      status: updated.status as OrderStatus,
                      rider_id: updated.rider_id ?? null,
                    }
                  : o
              )
            );
          } else if (payload.eventType === "INSERT") {
            // Refetch to get full row with joins
            loadData();
          } else if (payload.eventType === "DELETE") {
            setOrders((prev) => prev.filter((o) => o.id !== (payload.old as any).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [loadData]);

  async function handleStatusChange(orderId: string, newStatus: OrderStatus) {
    // When marking as "out_for_delivery", always open the rider picker
    if (newStatus === "out_for_delivery") {
      setRiderPickerOrderId(orderId);
    } else {
      // Close picker if status moves away from out_for_delivery
      setRiderPickerOrderId((prev) => (prev === orderId ? null : prev));
    }

    await updateOrderStatus(orderId, newStatus);
  }

  async function updateOrderStatus(orderId: string, newStatus: OrderStatus) {
    setUpdatingId(orderId);
    const { error } = await (supabase.from("orders") as any)
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq("id", orderId);

    if (error) {
      alert("Failed to update status: " + error.message);
    } else {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
    }
    setUpdatingId(null);
  }

  async function handleRiderAssign(orderId: string, riderId: string | null) {
    setUpdatingId(orderId);
    setAssigningRider(true);
    const { error } = await (supabase.from("orders") as any)
      .update({ rider_id: riderId || null, updated_at: new Date().toISOString() })
      .eq("id", orderId);

    if (error) {
      alert("Failed to assign rider: " + error.message);
    } else {
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, rider_id: riderId } : o))
      );
    }
    setUpdatingId(null);
    setAssigningRider(false);
  }

  async function handleRiderSelectionInline(orderId: string, riderId: string) {
    await handleRiderAssign(orderId, riderId);
    setRiderPickerOrderId(null);
  }

  const filtered =
    filterStatus === "all" ? orders : orders.filter((o) => o.status === filterStatus);

  const statusCounts = orders.reduce<Record<string, number>>((acc, o) => {
    acc[o.status] = (acc[o.status] ?? 0) + 1;
    return acc;
  }, {});

  const riderMap = Object.fromEntries(riders.map((r) => [r.id, r]));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {orders.length} total · live updates enabled
          </p>
        </div>
        <button
          onClick={loadData}
          className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterStatus("all")}
          className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
            filterStatus === "all"
              ? "bg-foreground text-background border-foreground"
              : "border-border bg-background hover:bg-secondary"
          }`}
        >
          All <span className="opacity-60 ml-1">{orders.length}</span>
        </button>
        {STATUS_FLOW.map((s) => {
          const count = statusCounts[s] ?? 0;
          if (!count && filterStatus !== s) return null;
          return (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                filterStatus === s
                  ? "bg-foreground text-background border-foreground"
                  : "border-border bg-background hover:bg-secondary"
              }`}
            >
              {STATUS_LABEL[s]}{" "}
              {count > 0 && <span className="opacity-60 ml-1">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-destructive/10 border border-destructive/20 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center gap-3 py-12 justify-center text-muted-foreground">
          <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
          </svg>
          <span className="text-sm">Loading orders…</span>
        </div>
      )}

      {/* Empty */}
      {!loading && !error && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="mb-3 rounded-full bg-secondary p-4">
            <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <p className="font-semibold text-sm">No orders</p>
          <p className="text-xs text-muted-foreground mt-1">
            {filterStatus === "all" ? "Orders will appear here in real time." : `No orders with status "${STATUS_LABEL[filterStatus as OrderStatus]}".`}
          </p>
        </div>
      )}

      {/* Orders list */}
      {!loading && filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((o) => {
            const isExpanded = expandedId === o.id;
            const isUpdating = updatingId === o.id;
            const assignedRider = o.rider_id ? riderMap[o.rider_id] : null;

            return (
              <div
                key={o.id}
                className={`rounded-2xl border bg-card transition-shadow ${
                  isExpanded ? "border-border shadow-md" : "border-border hover:border-border-strong hover:shadow-sm"
                }`}
              >
                {/* Row header — always visible */}
                <button
                  className="w-full text-left px-5 py-4"
                  onClick={() => setExpandedId(isExpanded ? null : o.id)}
                >
                  <div className="flex items-start gap-4">
                    {/* Order ID + date */}
                    <div className="min-w-[80px]">
                      <p className="font-mono text-xs font-bold text-muted-foreground">
                        #{o.id.slice(0, 8).toUpperCase()}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {formatDate(o.created_at)} · {formatTime(o.created_at)}
                      </p>
                    </div>

                    {/* Customer */}
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{o.customer_name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">{o.customer_phone ?? "—"}</p>
                    </div>

                    {/* Items + total */}
                    <div className="hidden sm:block text-right">
                      <p className="text-sm font-bold">{formatPrice(o.total)}</p>
                      <p className="text-xs text-muted-foreground">
                        {o.item_count} {o.item_count === 1 ? "item" : "items"}
                      </p>
                    </div>

                    {/* Status badge */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span
                        className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                          STATUS_COLORS[o.status] ?? "bg-secondary text-foreground border-border"
                        }`}
                      >
                        {STATUS_LABEL[o.status]}
                      </span>
                      <RiderBadge rider={assignedRider} riders={riders} />
                    </div>

                    {/* Chevron */}
                    <svg
                      className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3">
                    <ProgressBar status={o.status} />
                  </div>
                </button>

                {/* Expanded controls */}
                {isExpanded && (
                  <div className="border-t border-border px-5 py-4 bg-secondary/30 rounded-b-2xl">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
                        Order status
                      </label>
                      <select
                        value={o.status}
                        disabled={isUpdating}
                        onChange={(e) =>
                          handleStatusChange(o.id, e.target.value as OrderStatus)
                        }
                        className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium focus:border-primary focus:outline-none disabled:opacity-50 transition-colors"
                      >
                        {STATUS_FLOW.map((s) => (
                          <option key={s} value={s}>
                            {STATUS_LABEL[s]}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Rider section — only when out_for_delivery */}
                    {o.status === "out_for_delivery" && (
                      <>
                        {/* If rider already assigned and picker is closed: show assigned rider + reassign button */}
                        {o.rider_id && riderPickerOrderId !== o.id ? (
                          <div className="mt-3 flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50/40 px-3 py-2.5">
                            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                              {(riderMap[o.rider_id]?.name ?? "?").charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-foreground">
                                {riderMap[o.rider_id]?.name ?? "Assigned rider"}
                              </p>
                              <p className="text-[11px] text-muted-foreground">
                                {riderMap[o.rider_id]?.phone ?? ""}
                              </p>
                            </div>
                            <button
                              onClick={() => setRiderPickerOrderId(o.id)}
                              className="shrink-0 rounded-lg border border-indigo-200 bg-background px-2.5 py-1.5 text-[11px] font-semibold text-indigo-600 transition-colors hover:bg-indigo-50"
                            >
                              Reassign
                            </button>
                          </div>
                        ) : (
                          /* Picker open (new assignment or reassignment) */
                          <RiderPickerPanel
                            riders={riders}
                            selectedRiderId={o.rider_id}
                            onSelect={(riderId) => handleRiderSelectionInline(o.id, riderId)}
                            isAssigning={assigningRider}
                          />
                        )}
                      </>
                    )}

                    {/* Order items breakdown */}
                    {(o.order_items ?? []).length > 0 && (
                      <div className="mt-4 rounded-xl border border-border bg-background p-3">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground mb-2">
                          Order details
                        </p>
                        <div className="space-y-1.5">
                          {(o.order_items ?? []).map((item, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">
                                <span className="font-semibold text-foreground">{item.quantity}×</span>{" "}
                                {item.food_name}
                              </span>
                              <span className="font-medium">{formatPrice(item.food_price * item.quantity)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-2 border-t border-border pt-2 space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Subtotal</span>
                            <span>{formatPrice(o.subtotal ?? 0)}</span>
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Delivery fee</span>
                            <span>{formatPrice(o.delivery_fee ?? 0)}</span>
                          </div>
                          <div className="flex justify-between text-sm font-bold">
                            <span>Total</span>
                            <span>{formatPrice(o.total)}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Delivery address */}
                    {o.delivery_address && (
                      <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
                        <svg className="w-3.5 h-3.5 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>{o.delivery_address}</span>
                      </div>
                    )}

                    {/* Updating indicator */}
                    {isUpdating && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                        <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Saving…
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}


    </div>
  );
}