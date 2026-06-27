import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/utils";
import type { DbOrder } from "@/types/supabase";
import { supabase } from "@/lib/supabaseClient";

export const Route = createFileRoute("/admin/customers")({
  component: AdminCustomers,
});

type CustomerRow = {
  phone: string;
  name: string;
  email: string | null;
  orders: number;
  total: number;
};

type CustomerOrderRow = Pick<DbOrder, "customer_name" | "customer_phone" | "customer_email" | "total">;

async function fetchCustomers(): Promise<CustomerRow[]> {
  const { data, error } = (await supabase
    .from("orders")
    .select("customer_name, customer_phone, customer_email, total")
    .not("customer_phone", "is", null)) as {
    data: CustomerOrderRow[] | null;
    error: Error | null;
  };

  if (error) throw error;

  const map = new Map<string, CustomerRow>();
  for (const o of data ?? []) {
    const key = o.customer_phone as string;
    const cur = map.get(key) ?? {
      phone: key,
      name: o.customer_name ?? "Unknown",
      email: o.customer_email ?? null,
      orders: 0,
      total: 0,
    };
    cur.orders += 1;
    cur.total += o.total ?? 0;
    map.set(key, cur);
  }

  return [...map.values()].sort((a, b) => b.total - a.total);
}

function AdminCustomers() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        setCustomers(await fetchCustomers());
      } catch (e: any) {
        setError(e.message ?? "Failed to load customers.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div>
      <h1 className="mb-6 text-3xl font-bold">Customers</h1>

      {loading && <p className="text-muted-foreground">Loading customers…</p>}

      {error && (
        <div className="mb-4 rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && customers.length === 0 && (
        <p className="text-muted-foreground">No customers yet.</p>
      )}

      {!loading && customers.length > 0 && (
        <>
          {/* Mobile: card list — hidden on md+ */}
          <div className="space-y-3 md:hidden">
            {customers.map((c) => (
              <div key={c.phone} className="flex items-center gap-3 rounded-2xl bg-card p-4 shadow-soft">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-hero text-sm font-bold text-white">
                  {c.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{c.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{c.phone}</p>
                  {c.email && <p className="truncate text-xs text-muted-foreground">{c.email}</p>}
                </div>
                <div className="shrink-0 text-right">
                  <p className="font-bold">{formatPrice(c.total)}</p>
                  <p className="text-xs text-muted-foreground">{c.orders} {c.orders === 1 ? "order" : "orders"}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: original table — hidden below md */}
          <div className="hidden overflow-hidden rounded-3xl bg-card shadow-soft md:block">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60">
                <tr className="text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  <th className="px-5 py-3">Customer</th>
                  <th className="px-5 py-3">Phone</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Orders</th>
                  <th className="px-5 py-3 text-right">Lifetime spend</th>
                </tr>
              </thead>
              <tbody>
                {customers.map((c) => (
                  <tr key={c.phone} className="border-t border-border">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-hero text-sm font-bold text-white">
                          {c.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="font-semibold">{c.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{c.phone}</td>
                    <td className="px-5 py-4 text-muted-foreground">{c.email ?? "—"}</td>
                    <td className="px-5 py-4 font-semibold">{c.orders}</td>
                    <td className="px-5 py-4 text-right font-bold">{formatPrice(c.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}