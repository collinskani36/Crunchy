import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { MapPin, Smartphone, User } from "lucide-react";
import { useEffect, useState } from "react";
import { PageShell } from "@/components/PageShell";
import { formatPrice } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabaseClient";

const TILL_NUMBER = "123456";

// ── types ─────────────────────────────────────────────────────────────────────

type DeliveryTier = {
  id: string;
  label: string;
  max_distance_km: number;
  fee: number;
};

// ── route ─────────────────────────────────────────────────────────────────────

export const Route = createFileRoute("/checkout")({
  head: () => ({ meta: [{ title: "Checkout — Crunchy Inn" }] }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const navigate = useNavigate();
  const cart = useStore((s) => s.cart);
  const clearCart = useStore((s) => s.clearCart);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [tiers, setTiers] = useState<DeliveryTier[]>([]);
  const [selectedTierId, setSelectedTierId] = useState<string>("");
  const [tiersLoading, setTiersLoading] = useState(true);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── fetch delivery tiers once ──────────────────────────────────────────────
  useEffect(() => {
    async function fetchTiers() {
      const { data } = await supabase
        .from("delivery_tiers")
        .select("id, label, max_distance_km, fee")
        .eq("is_active", true)
        .order("max_distance_km");

      if (data && data.length > 0) {
        setTiers(data as DeliveryTier[]);
        setSelectedTierId((data as DeliveryTier[])[0].id);
      }
      setTiersLoading(false);
    }
    fetchTiers();
  }, []);

  const selectedTier = tiers.find((t) => t.id === selectedTierId);
  const deliveryFee = selectedTier?.fee ?? 0;
  const subtotal = cart.reduce((s, c) => s + c.food.price * c.qty, 0);
  const total = subtotal + deliveryFee;

  if (cart.length === 0) {
    return (
      <PageShell>
        <div className="rounded-3xl bg-card p-10 text-center shadow-soft">
          <p>Your cart is empty.</p>
        </div>
      </PageShell>
    );
  }

  // ── submit: insert order + order_items ────────────────────────────────────
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) { setError("Please enter a delivery address."); return; }
    if (!name.trim()) { setError("Please enter your name."); return; }
    if (!phone.trim()) { setError("Please enter your phone number."); return; }

    setSubmitting(true);
    setError(null);

    // 1. Insert the order — generate id client-side to avoid chaining .select()
    //    which triggers a SELECT that the anon RLS policy blocks.
    const orderId = crypto.randomUUID();

    const { error: orderError } = await (supabase.from("orders") as any)
      .insert({
        id: orderId,
        customer_name: name.trim(),
        customer_phone: phone.trim(),
        delivery_address: address.trim(),
        subtotal,
        delivery_fee: deliveryFee,
        total,
        payment_method: "mpesa_buy_goods",
        status: "pending",
      });

    if (orderError) {
      console.error("order insert error:", orderError);
      setError("Failed to place order. Please try again.");
      setSubmitting(false);
      return;
    }

    // 2. Insert order_items — cast numerics explicitly to avoid type coercion errors
    const items = cart.map((c) => ({
      order_id: orderId,
      food_id: String(c.food.id),
      food_name: String(c.food.name),
      food_price: Number(c.food.price),
      quantity: Number(c.qty),
      // item_total is a generated column (food_price * quantity) — Postgres computes it
    }));

    const { error: itemsError } = await (supabase.from("order_items") as any).insert(items);

    if (itemsError) {
      console.error("order_items insert error:", itemsError);
      setError(`Items failed to save: ${itemsError.message}`);
      setSubmitting(false);
      return;
    }

    // 3. Clear local cart and navigate to order tracking
    clearCart();
    navigate({ to: "/orders/$orderId", params: { orderId } });
  };

  return (
    <PageShell>
      <h1 className="mb-6 text-3xl font-bold md:text-4xl">Checkout</h1>
      {/* no <form> wrapper — using div + button onClick per project convention */}
      <div className="grid gap-6 md:grid-cols-[1fr,360px]">
        <div className="space-y-5">

          {/* Contact */}
          <Section icon={<User className="h-4 w-4" />} title="Contact">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Full name" value={name} onChange={setName} placeholder="Jane Doe" />
              <Field label="Phone number" value={phone} onChange={setPhone} placeholder="+254 700 000 000" />
            </div>
          </Section>

          {/* Delivery address */}
          <Section icon={<MapPin className="h-4 w-4" />} title="Delivery address">
            <Field
              label="Street / estate / landmark"
              value={address}
              onChange={setAddress}
              placeholder="e.g. Rongai, Tumaini Estate, Gate 3"
            />

            {/* Delivery tier picker */}
            <div className="mt-4">
              <p className="mb-2 text-xs font-semibold text-muted-foreground">Delivery zone</p>
              {tiersLoading ? (
                <div className="h-10 animate-pulse rounded-xl bg-muted" />
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {tiers.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setSelectedTierId(t.id)}
                      className={`rounded-2xl border-2 p-3 text-left text-sm transition-smooth ${
                        selectedTierId === t.id
                          ? "border-primary bg-primary/5"
                          : "border-border text-muted-foreground"
                      }`}
                    >
                      <p className="font-semibold">{t.label}</p>
                      <p className="text-xs">Up to {t.max_distance_km} km · {formatPrice(t.fee)}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </Section>

          {/* Payment */}
          <Section icon={<Smartphone className="h-4 w-4" />} title="Payment">
            <div className="rounded-2xl bg-green-50 p-4 dark:bg-green-950/30">
              <p className="text-sm font-semibold text-green-800 dark:text-green-300">
                M-Pesa Buy Goods
              </p>
              <p className="mt-1 text-sm text-green-700 dark:text-green-400">
                Send payment to till number{" "}
                <span className="font-bold tracking-widest">{TILL_NUMBER}</span>
              </p>
              <p className="mt-3 text-lg font-bold text-green-900 dark:text-green-200">
                {formatPrice(total)}
              </p>
              <p className="mt-1 text-xs text-green-600 dark:text-green-500">
                Complete the M-Pesa payment, then tap "Place order" below. Our team will confirm once we receive it.
              </p>
            </div>
          </Section>

          {error && (
            <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</p>
          )}
        </div>

        {/* Order summary sidebar */}
        <aside className="h-fit rounded-3xl bg-card p-6 shadow-card md:sticky md:top-24">
          <h2 className="text-lg font-bold">Your order</h2>
          <div className="mt-4 space-y-2">
            {cart.map((c) => (
              <div key={c.food.id} className="flex items-center justify-between text-sm">
                <span className="truncate">
                  <span className="font-bold">{c.qty}×</span> {c.food.name}
                </span>
                <span className="font-semibold">{formatPrice(c.food.price * c.qty)}</span>
              </div>
            ))}
          </div>
          <div className="my-4 border-t border-border" />
          <div className="space-y-2 text-sm">
            <Row label="Subtotal" value={formatPrice(subtotal)} />
            <Row label="Delivery" value={tiersLoading ? "—" : formatPrice(deliveryFee)} />
            <div className="my-2 border-t border-border" />
            <Row label="Total" value={formatPrice(total)} bold />
          </div>
          <button
            type="button"
            onClick={submit}
            disabled={submitting || tiersLoading}
            className="mt-6 w-full rounded-full bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-glow transition-smooth hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? "Placing order…" : "Place order"}
          </button>
        </aside>
      </div>
    </PageShell>
  );
}

// ── small shared components ───────────────────────────────────────────────────

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-3xl bg-card p-5 shadow-soft">
      <div className="mb-4 flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-primary">{icon}</span>
        <h3 className="font-bold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm focus:border-primary focus:outline-none"
      />
    </label>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "text-lg font-bold" : ""}`}>
      <span className={bold ? "" : "text-muted-foreground"}>{label}</span>
      <span className={bold ? "" : "font-semibold"}>{value}</span>
    </div>
  );
}