import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  MapPin,
  Phone,
  User as UserIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { OrderProgress } from "@/components/OrderProgress";
import { formatPrice } from "@/lib/utils";
import { supabase } from "@/lib/supabaseClient";
import type { OrderStatus } from "@/lib/store";

// ── DB types ──────────────────────────────────────────────────────────────────

type DbOrderItem = {
  id: string;
  food_id: string;
  food_name: string;
  food_price: number;
  quantity: number;
  item_total: number | null;
  notes: string | null;
};

type DbRider = {
  id: string;
  name: string;
  phone: string;
};

type DbOrder = {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  delivery_address: string | null;
  status: OrderStatus;
  subtotal: number;
  delivery_fee: number;
  total: number;
  created_at: string;
  estimated_delivery: string | null;
  riders: DbRider | null;
  order_items: DbOrderItem[];
};

// ── Route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/orders/$orderId")({
  head: () => ({ meta: [{ title: `Order — Crunchy Inn` }] }),
  component: OrderDetail,
});

function OrderDetail() {
  const { orderId } = Route.useParams();
  const [order, setOrder] = useState<DbOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // ── Initial fetch ──────────────────────────────────────────────────────────
  async function fetchOrder() {
    const { data, error } = await supabase
      .from("orders")
      .select(`
        id,
        customer_name,
        customer_phone,
        delivery_address,
        status,
        subtotal,
        delivery_fee,
        total,
        created_at,
        estimated_delivery,
        riders ( id, name, phone ),
        order_items ( id, food_id, food_name, food_price, quantity, item_total, notes )
      `)
      .eq("id", orderId)
      .single();

    if (error || !data) {
      setNotFound(true);
    } else {
      setOrder(data as DbOrder);
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchOrder();
  }, [orderId]);

  // ── Realtime subscription: admin status/rider changes appear instantly ─────
  // This replaces the old 30s polling. Supabase sends a message the moment
  // the admin updates the order row, so the customer sees changes in ~1s.
  useEffect(() => {
    if (!order || order.status === "delivered" || order.status === "cancelled") {
      return;
    }

    const channel = supabase
      .channel(`order-${orderId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "orders",
          filter: `id=eq.${orderId}`,
        },
        async (payload) => {
          const updated = payload.new as any;

          // If rider_id changed, we need to refetch to get joined rider details.
          // If only status changed, we can update in place without a round trip.
          if (updated.rider_id !== order?.riders?.id) {
            // Rider assignment changed — refetch to get name/phone from join
            await fetchOrder();
          } else {
            setOrder((prev) =>
              prev
                ? { ...prev, status: updated.status as OrderStatus }
                : prev
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [orderId, order?.status, order?.riders?.id]);

  // ── Loading skeleton ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <PageShell>
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-32 rounded bg-muted" />
          <div className="h-10 w-64 rounded bg-muted" />
          <div className="grid gap-6 md:grid-cols-[1fr,1fr]">
            <div className="h-96 rounded-3xl bg-muted" />
            <div className="space-y-4">
              <div className="h-24 rounded-3xl bg-muted" />
              <div className="h-48 rounded-3xl bg-muted" />
            </div>
          </div>
        </div>
      </PageShell>
    );
  }

  if (notFound || !order) {
    return (
      <PageShell>
        <p className="rounded-3xl bg-card p-8 text-center shadow-soft">
          Order not found.{" "}
          <Link to="/orders" className="text-primary">
            Back
          </Link>
        </p>
      </PageShell>
    );
  }

  const etaMinutes =
    order.estimated_delivery
      ? Math.max(
          0,
          Math.round(
            (new Date(order.estimated_delivery).getTime() - Date.now()) / 60000
          )
        )
      : null;

  // Show rider card only while the order is active and a rider is assigned
  const showRider =
    order.riders &&
    order.status !== "delivered" &&
    order.status !== "cancelled";

  return (
    <PageShell>
      <Link
        to="/orders"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All orders
      </Link>

      <div className="mb-6">
        <p className="text-sm text-muted-foreground">Order</p>
        <h1 className="truncate text-2xl font-bold md:text-3xl">{order.id}</h1>
        <p className="text-sm text-muted-foreground">
          Placed {new Date(order.created_at).toLocaleString()}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr,1fr]">
        {/* Left — progress tracker (imported from components, not inline) */}
        <OrderProgress status={order.status} />

        {/* Right — details */}
        <div className="space-y-4">
          {/* Rider card */}
          {showRider && (
            <div className="rounded-3xl bg-gradient-hero p-5 text-white shadow-card">
              <p className="text-xs font-bold uppercase tracking-wider opacity-80">
                Your rider
              </p>
              <div className="mt-2 flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-full bg-white/20 text-2xl">
                  🛵
                </div>
                <div className="flex-1">
                  <p className="font-bold">{order.riders!.name}</p>
                  {etaMinutes !== null && (
                    <p className="text-sm opacity-80">ETA {etaMinutes} min</p>
                  )}
                </div>
                <a
                  href={`tel:${order.riders!.phone}`}
                  className="grid h-10 w-10 place-items-center rounded-full bg-white/20 transition-smooth hover:bg-white/30"
                >
                  <Phone className="h-4 w-4" />
                </a>
              </div>
            </div>
          )}

          {/* Delivery address & customer */}
          <div className="rounded-3xl bg-card p-5 shadow-soft">
            <h3 className="mb-3 font-bold">Delivery to</h3>
            <div className="flex items-start gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary">
                <MapPin className="h-4 w-4" />
              </span>
              <div>
                <p className="font-semibold">
                  {order.delivery_address ?? "—"}
                </p>
              </div>
            </div>
            <div className="mt-3 flex items-start gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-primary/10 text-primary">
                <UserIcon className="h-4 w-4" />
              </span>
              <div>
                <p className="font-semibold">{order.customer_name ?? "—"}</p>
                <p className="text-sm text-muted-foreground">
                  {order.customer_phone ?? "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Order items */}
          <div className="rounded-3xl bg-card p-5 shadow-soft">
            <h3 className="mb-3 font-bold">Items</h3>
            <div className="space-y-3">
              {order.order_items.map((it) => (
                <div key={it.id} className="flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-2xl">
                    🍽️
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{it.food_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {it.quantity} × {formatPrice(it.food_price)}
                    </p>
                  </div>
                  <p className="font-semibold">
                    {formatPrice(it.item_total ?? it.food_price * it.quantity)}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatPrice(order.subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Delivery</span>
                <span>{formatPrice(order.delivery_fee)}</span>
              </div>
              <div className="flex justify-between pt-1 text-base font-bold">
                <span>Total</span>
                <span>{formatPrice(order.total)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
}