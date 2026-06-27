import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MapPin, Truck, Plus, X, Pencil, Trash2, Star, Wifi, WifiOff } from "lucide-react";
import { STATUS_LABEL, type OrderStatus } from "@/lib/store";
import { supabase } from "@/lib/supabaseClient";

export const Route = createFileRoute("/admin/deliveries")({
  component: AdminDeliveries,
});

// ─── Types ────────────────────────────────────────────────────────────────────

type DeliveryRow = {
  id: string;
  status: OrderStatus;
  delivery_address: string | null;
  delivery_notes: string | null;
  estimated_delivery: string | null;
  rider_name: string | null;
  rider_phone: string | null;
};

type RawOrder = {
  id: string;
  status: string;
  delivery_address: string | null;
  delivery_notes: string | null;
  estimated_delivery: string | null;
  riders: { name: string; phone: string } | null;
};

type Rider = {
  id: string;
  name: string;
  phone: string;
  photo_url: string | null;
  is_active: boolean;
  is_online: boolean;
  rating: number | null;
};

type DeliveryTier = {
  id: string;
  label: string;
  max_distance_km: number;
  fee: number;
  is_active: boolean;
};

// ─── Fetch helpers ─────────────────────────────────────────────────────────────

async function fetchActiveDeliveries(): Promise<DeliveryRow[]> {
  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      status,
      delivery_address,
      delivery_notes,
      estimated_delivery,
      riders(name, phone)
    `)
    .in("status", ["ready", "out_for_delivery"])
    .order("updated_at", { ascending: false })
    .returns<RawOrder[]>();

  if (error) throw error;

  return (data ?? []).map((o) => ({
    id: o.id,
    status: o.status as OrderStatus,
    delivery_address: o.delivery_address,
    delivery_notes: o.delivery_notes,
    estimated_delivery: o.estimated_delivery,
    rider_name: o.riders?.name ?? null,
    rider_phone: o.riders?.phone ?? null,
  }));
}

async function fetchRiders(): Promise<Rider[]> {
  const { data, error } = await supabase
    .from("riders")
    .select("id, name, phone, photo_url, is_active, is_online, rating")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

async function fetchDeliveryTiers(): Promise<DeliveryTier[]> {
  const { data, error } = await supabase
    .from("delivery_tiers")
    .select("id, label, max_distance_km, fee, is_active")
    .order("max_distance_km", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

function etaLabel(estimated_delivery: string | null): string {
  if (!estimated_delivery) return "ETA unknown";
  const mins = Math.round((new Date(estimated_delivery).getTime() - Date.now()) / 60_000);
  if (mins <= 0) return "Arriving now";
  return `ETA ${mins} min`;
}

// ─── Reusable UI bits ──────────────────────────────────────────────────────────

function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-xl font-bold">{title}</h2>
      {action}
    </div>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-sm transition hover:opacity-90"
    >
      <Plus className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

function FormInput({
  label,
  type = "text",
  value,
  onChange,
  placeholder,
  step,
  min,
}: {
  label: string;
  type?: string;
  value: string | number;
  onChange: (v: string) => void;
  placeholder?: string;
  step?: string;
  min?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        step={step}
        min={min}
        className="rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40"
      />
    </label>
  );
}

function Modal({
  title,
  onClose,
  onSubmit,
  submitting,
  children,
}: {
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  submitting: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-3xl bg-card p-6 shadow-xl">
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-lg font-bold">{title}</h3>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex flex-col gap-4">{children}</div>
        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-full border border-border py-2 text-sm font-semibold hover:bg-muted"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={submitting}
            className="flex-1 rounded-full bg-primary py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Riders panel ──────────────────────────────────────────────────────────────

type RiderForm = { name: string; phone: string; photo_url: string };
const emptyRiderForm = (): RiderForm => ({ name: "", phone: "", photo_url: "" });

function RidersPanel() {
  const [riders, setRiders] = useState<Rider[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Rider | null>(null);
  const [form, setForm] = useState<RiderForm>(emptyRiderForm());
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    try { setRiders(await fetchRiders()); }
    catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }

  function openAdd() {
    setEditing(null);
    setForm(emptyRiderForm());
    setModalOpen(true);
  }

  function openEdit(r: Rider) {
    setEditing(r);
    setForm({ name: r.name, phone: r.phone, photo_url: r.photo_url ?? "" });
    setModalOpen(true);
  }

  async function handleSubmit() {
    if (!form.name.trim() || !form.phone.trim()) {
      setErr("Name and phone are required.");
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      const payload: any = {
        name: form.name.trim(),
        phone: form.phone.trim(),
        photo_url: form.photo_url.trim() || null,
      };
      if (editing) {
        const { error } = await (supabase.from("riders") as any).update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from("riders") as any).insert(payload);
        if (error) throw error;
      }
      setModalOpen(false);
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleActive(r: Rider) {
    await (supabase.from("riders") as any).update({ is_active: !r.is_active }).eq("id", r.id);
    await load();
  }

  async function deleteRider(id: string) {
    if (!confirm("Remove this rider?")) return;
    await supabase.from("riders").delete().eq("id", id);
    await load();
  }

  return (
    <section className="mb-10">
      <SectionHeader
        title="Riders"
        action={<AddButton label="Add Rider" onClick={openAdd} />}
      />

      {err && (
        <div className="mb-3 rounded-xl bg-destructive/10 px-4 py-2 text-sm text-destructive">{err}</div>
      )}

      {loading && <p className="text-sm text-muted-foreground">Loading riders…</p>}

      {!loading && riders.length === 0 && (
        <p className="rounded-3xl bg-card p-8 text-center text-sm text-muted-foreground shadow-soft">
          No riders yet. Add one to get started.
        </p>
      )}

      {!loading && riders.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {riders.map((r) => (
            <div key={r.id} className="rounded-3xl bg-card p-4 shadow-soft">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  {r.photo_url ? (
                    <img src={r.photo_url} alt={r.name} className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent/15 text-accent">
                      <Truck className="h-4 w-4" />
                    </span>
                  )}
                  <div>
                    <p className="font-semibold text-sm">{r.name}</p>
                    <p className="text-xs text-muted-foreground">{r.phone}</p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button onClick={() => openEdit(r)} className="rounded-full p-1.5 hover:bg-muted">
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  <button onClick={() => deleteRider(r.id)} className="rounded-full p-1.5 hover:bg-destructive/10">
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </button>
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <div className="flex items-center gap-3 text-xs">
                  <span className={`flex items-center gap-1 font-medium ${r.is_online ? "text-green-600" : "text-muted-foreground"}`}>
                    {r.is_online ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
                    {r.is_online ? "Online" : "Offline"}
                  </span>
                  {r.rating != null && (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      {Number(r.rating).toFixed(1)}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => toggleActive(r)}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-semibold transition ${
                    r.is_active
                      ? "bg-primary/10 text-primary"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {r.is_active ? "Active" : "Inactive"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalOpen && (
        <Modal
          title={editing ? "Edit Rider" : "Add Rider"}
          onClose={() => setModalOpen(false)}
          onSubmit={handleSubmit}
          submitting={submitting}
        >
          {err && <p className="text-xs text-destructive">{err}</p>}
          <FormInput label="Full Name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="e.g. James Mwangi" />
          <FormInput label="Phone Number" value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} placeholder="+254 7XX XXX XXX" />
          <FormInput label="Photo URL (optional)" value={form.photo_url} onChange={(v) => setForm((f) => ({ ...f, photo_url: v }))} placeholder="https://…" />
        </Modal>
      )}
    </section>
  );
}

// ─── Delivery Tiers panel ──────────────────────────────────────────────────────

type TierForm = { label: string; max_distance_km: string; fee: string };
const emptyTierForm = (): TierForm => ({ label: "", max_distance_km: "", fee: "" });

function DeliveryTiersPanel() {
  const [tiers, setTiers] = useState<DeliveryTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DeliveryTier | null>(null);
  const [form, setForm] = useState<TierForm>(emptyTierForm());
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    try { setTiers(await fetchDeliveryTiers()); }
    catch (e: any) { setErr(e.message); }
    finally { setLoading(false); }
  }

  function openAdd() {
    setEditing(null);
    setForm(emptyTierForm());
    setModalOpen(true);
  }

  function openEdit(t: DeliveryTier) {
    setEditing(t);
    setForm({
      label: t.label,
      max_distance_km: String(t.max_distance_km),
      fee: String(t.fee),
    });
    setModalOpen(true);
  }

  async function handleSubmit() {
    const km = parseFloat(form.max_distance_km);
    const fee = parseFloat(form.fee);
    if (!form.label.trim() || isNaN(km) || isNaN(fee)) {
      setErr("All fields are required and must be valid numbers.");
      return;
    }
    setSubmitting(true);
    setErr(null);
    try {
      const payload: any = { label: form.label.trim(), max_distance_km: km, fee };
      if (editing) {
        const { error } = await (supabase.from("delivery_tiers") as any).update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await (supabase.from("delivery_tiers") as any).insert({ ...payload, is_active: true });
        if (error) throw error;
      }
      setModalOpen(false);
      await load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleTierActive(t: DeliveryTier) {
    await (supabase.from("delivery_tiers") as any).update({ is_active: !t.is_active }).eq("id", t.id);
    await load();
  }

  async function deleteTier(id: string) {
    if (!confirm("Delete this delivery tier?")) return;
    await supabase.from("delivery_tiers").delete().eq("id", id);
    await load();
  }

  return (
    <section className="mb-10">
      <SectionHeader
        title="Delivery Fees"
        action={<AddButton label="Add Tier" onClick={openAdd} />}
      />

      {err && (
        <div className="mb-3 rounded-xl bg-destructive/10 px-4 py-2 text-sm text-destructive">{err}</div>
      )}

      {loading && <p className="text-sm text-muted-foreground">Loading delivery tiers…</p>}

      {!loading && tiers.length === 0 && (
        <p className="rounded-3xl bg-card p-8 text-center text-sm text-muted-foreground shadow-soft">
          No delivery tiers yet. Add one to define your fee zones.
        </p>
      )}

      {!loading && tiers.length > 0 && (
        <div className="overflow-hidden rounded-3xl bg-card shadow-soft">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs font-semibold text-muted-foreground">
                <th className="px-5 py-3">Zone Label</th>
                <th className="px-5 py-3">Max Distance</th>
                <th className="px-5 py-3">Fee</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {tiers.map((t, i) => (
                <tr key={t.id} className={i !== tiers.length - 1 ? "border-b border-border" : ""}>
                  <td className="px-5 py-3 font-semibold">{t.label}</td>
                  <td className="px-5 py-3 text-muted-foreground">{t.max_distance_km} km</td>
                  <td className="px-5 py-3 font-mono font-semibold">KSh {Number(t.fee).toLocaleString()}</td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => toggleTierActive(t)}
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        t.is_active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {t.is_active ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => openEdit(t)} className="rounded-full p-1.5 hover:bg-muted">
                        <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      <button onClick={() => deleteTier(t.id)} className="rounded-full p-1.5 hover:bg-destructive/10">
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <Modal
          title={editing ? "Edit Delivery Tier" : "Add Delivery Tier"}
          onClose={() => setModalOpen(false)}
          onSubmit={handleSubmit}
          submitting={submitting}
        >
          {err && <p className="text-xs text-destructive">{err}</p>}
          <FormInput label="Zone Label" value={form.label} onChange={(v) => setForm((f) => ({ ...f, label: v }))} placeholder="e.g. Nearby, City Centre, Suburbs" />
          <FormInput label="Max Distance (km)" type="number" step="0.1" min="0" value={form.max_distance_km} onChange={(v) => setForm((f) => ({ ...f, max_distance_km: v }))} placeholder="e.g. 5" />
          <FormInput label="Delivery Fee (KSh)" type="number" step="1" min="0" value={form.fee} onChange={(v) => setForm((f) => ({ ...f, fee: v }))} placeholder="e.g. 150" />
        </Modal>
      )}
    </section>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

function AdminDeliveries() {
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    load();

    // Real-time updates for order status changes
    const channel = supabase
      .channel("active-deliveries")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        () => load()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  async function load() {
    try {
      setDeliveries(await fetchActiveDeliveries());
      setError(null);
    } catch (e: any) {
      setError(e.message ?? "Failed to load deliveries.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="mb-8 text-3xl font-bold">Deliveries</h1>

      {/* ── Riders management ── */}
      <RidersPanel />

      {/* ── Delivery fee tiers management ── */}
      <DeliveryTiersPanel />

      {/* ── Active deliveries (unchanged) ── */}
      <section>
        <SectionHeader title="Active Deliveries" />

        {loading && <p className="text-muted-foreground">Loading deliveries…</p>}

        {error && (
          <div className="mb-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {!loading && !error && deliveries.length === 0 && (
          <p className="rounded-3xl bg-card p-10 text-center text-sm text-muted-foreground shadow-soft">
            No active deliveries.
          </p>
        )}

        {!loading && deliveries.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2">
            {deliveries.map((o) => (
              <div key={o.id} className="rounded-3xl bg-card p-5 shadow-soft">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-xs font-bold text-muted-foreground">
                    #{o.id.slice(0, 8).toUpperCase()}
                  </p>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {STATUS_LABEL[o.status]}
                  </span>
                </div>

                <div className="mt-4 flex items-start gap-3 text-sm">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                    <MapPin className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold">{o.delivery_address ?? "No address"}</p>
                    {o.delivery_notes && (
                      <p className="text-muted-foreground">{o.delivery_notes}</p>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-3 text-sm">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent/15 text-accent">
                    <Truck className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold">
                      {o.rider_name ?? "Awaiting rider"}
                      {o.rider_phone && (
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          {o.rider_phone}
                        </span>
                      )}
                    </p>
                    <p className="text-muted-foreground">{etaLabel(o.estimated_delivery)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}