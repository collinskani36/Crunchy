import { createFileRoute, Link } from "@tanstack/react-router";
import { Heart, LogOut, MapPin, Package, Settings, Trash2 } from "lucide-react";
import { useState } from "react";
import { PageShell } from "@/components/PageShell";
import { FoodCard } from "@/components/FoodCard";
import { foods } from "@/lib/data";
import { useStore } from "@/lib/store";

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

function AccountPage() {
  const user = useStore((s) => s.user);
  const logout = useStore((s) => s.logout);
  const orders = useStore((s) => s.orders);
  const addresses = useStore((s) => s.addresses);
  const removeAddress = useStore((s) => s.removeAddress);
  const addAddress = useStore((s) => s.addAddress);
  const favIds = useStore((s) => s.favorites);
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("orders");
  const [newAddr, setNewAddr] = useState({ label: "", line1: "", city: "" });
  const favs = foods.filter((f) => favIds.includes(f.id));

  const displayName = user?.name ?? "Guest";
  const displayEmail = user?.email ?? "Sign in to sync your data";

  return (
    <PageShell>
      <div className="mb-8 flex items-center gap-4 rounded-3xl bg-gradient-hero p-6 text-white shadow-card">
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/20 text-2xl font-bold">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{displayName}</h1>
          <p className="text-sm text-white/80">{displayEmail}</p>
        </div>
        {user ? (
          <button onClick={logout} className="grid h-10 w-10 place-items-center rounded-full bg-white/15 transition-smooth hover:bg-white/25" aria-label="Logout">
            <LogOut className="h-4 w-4" />
          </button>
        ) : (
          <Link to="/login" className="rounded-full bg-white px-4 py-2 text-sm font-bold text-primary">Sign in</Link>
        )}
      </div>

      <div className="scrollbar-hide mb-6 flex gap-2 overflow-x-auto">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-smooth ${active ? "bg-charcoal text-charcoal-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}
            >
              <Icon className="h-4 w-4" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "orders" && (
        <div className="space-y-3">
          {orders.slice(0, 5).map((o) => (
            <Link key={o.id} to="/orders/$orderId" params={{ orderId: o.id }} className="flex items-center justify-between rounded-2xl bg-card p-4 shadow-soft transition-smooth hover:shadow-card">
              <div>
                <p className="font-bold">{o.id}</p>
                <p className="text-xs text-muted-foreground">{o.items.length} items · {new Date(o.createdAt).toLocaleDateString()}</p>
              </div>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">{o.status.replace("_", " ")}</span>
            </Link>
          ))}
        </div>
      )}

      {tab === "addresses" && (
        <div className="space-y-3">
          {addresses.map((a) => (
            <div key={a.id} className="flex items-center justify-between rounded-2xl bg-card p-4 shadow-soft">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary"><MapPin className="h-4 w-4" /></span>
                <div>
                  <p className="font-bold">{a.label}</p>
                  <p className="text-sm text-muted-foreground">{a.line1}, {a.city}</p>
                </div>
              </div>
              <button onClick={() => removeAddress(a.id)} className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground transition-smooth hover:bg-destructive/10 hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!newAddr.line1) return;
              addAddress({ label: newAddr.label || "Other", line1: newAddr.line1, city: newAddr.city || "Lagos" });
              setNewAddr({ label: "", line1: "", city: "" });
            }}
            className="rounded-2xl border-2 border-dashed border-border p-4"
          >
            <p className="mb-3 font-semibold">Add new address</p>
            <div className="grid gap-2 sm:grid-cols-3">
              <input value={newAddr.label} onChange={(e) => setNewAddr({ ...newAddr, label: e.target.value })} placeholder="Label" className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" />
              <input value={newAddr.line1} onChange={(e) => setNewAddr({ ...newAddr, line1: e.target.value })} placeholder="Address" className="rounded-xl border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none sm:col-span-2" required />
            </div>
            <button className="mt-3 rounded-full bg-primary px-5 py-2 text-sm font-bold text-primary-foreground transition-smooth hover:-translate-y-0.5">Save address</button>
          </form>
        </div>
      )}

      {tab === "favorites" && (
        favs.length === 0 ? (
          <div className="rounded-3xl bg-card p-10 text-center shadow-soft">
            <p className="text-5xl">❤️</p>
            <p className="mt-3 font-semibold">No favorites yet</p>
            <p className="text-sm text-muted-foreground">Tap the heart on any dish to save it.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {favs.map((f) => <FoodCard key={f.id} food={f} />)}
          </div>
        )
      )}

      {tab === "settings" && (
        <div className="rounded-3xl bg-card p-6 shadow-soft">
          <p className="font-semibold">Profile</p>
          <p className="mt-2 text-sm text-muted-foreground">Email: {displayEmail}</p>
          <p className="text-sm text-muted-foreground">Name: {displayName}</p>
          <div className="mt-4 flex gap-2">
            {user ? (
              <button onClick={logout} className="rounded-full bg-destructive/10 px-4 py-2 text-sm font-bold text-destructive">Sign out</button>
            ) : (
              <Link to="/login" className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">Sign in</Link>
            )}
          </div>
        </div>
      )}
    </PageShell>
  );
}