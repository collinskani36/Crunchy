import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { formatPrice } from "@/lib/data";
import { supabase } from "@/lib/supabaseClient";

export const Route = createFileRoute("/admin/analytics")({
  component: AdminAnalytics,
});

type Bucket = { label: string; total: number };
type TopItem = { id: string; name: string; image_url: string | null; qty: number };

async function fetchAnalytics(): Promise<{ buckets: Bucket[]; top: TopItem[] }> {
  const days = 7;
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const [ordersRes, itemsRes] = await Promise.all([
    supabase
      .from("orders")
      .select("total, created_at")
      .gte("created_at", since),
    supabase
      .from("order_items")
      .select("food_id, food_name, quantity")
      .gte("created_at", since),
  ]);

  if (ordersRes.error) throw ordersRes.error;
  if (itemsRes.error) throw itemsRes.error;

  // Build day buckets
  const now = Date.now();
  const buckets: Bucket[] = Array.from({ length: days }, (_, i) => {
    const dayStart = now - (days - 1 - i) * 86_400_000;
    return {
      label: new Date(dayStart).toLocaleDateString(undefined, { weekday: "short" }),
      total: 0,
    };
  });
  for (const o of ordersRes.data ?? []) {
    const diff = Math.floor((now - new Date(o.created_at).getTime()) / 86_400_000);
    if (diff < days) buckets[days - 1 - diff].total += o.total ?? 0;
  }

  // Build top sellers
  const countMap = new Map<string, { name: string; qty: number }>();
  for (const it of itemsRes.data ?? []) {
    const cur = countMap.get(it.food_id) ?? { name: it.food_name, qty: 0 };
    cur.qty += it.quantity;
    countMap.set(it.food_id, cur);
  }

  // Fetch image_url for top food ids
  const sorted = [...countMap.entries()]
    .sort((a, b) => b[1].qty - a[1].qty)
    .slice(0, 5);

  const foodIds = sorted.map(([id]) => id);
  const { data: foodRows } = await supabase
    .from("foods")
    .select("id, image_url")
    .in("id", foodIds);

  const imageMap = new Map((foodRows ?? []).map((f) => [f.id, f.image_url]));

  const top: TopItem[] = sorted.map(([id, { name, qty }]) => ({
    id,
    name,
    qty,
    image_url: imageMap.get(id) ?? null,
  }));

  return { buckets, top };
}

function AdminAnalytics() {
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [top, setTop] = useState<TopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { buckets, top } = await fetchAnalytics();
        setBuckets(buckets);
        setTop(top);
      } catch (e: any) {
        setError(e.message ?? "Failed to load analytics.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const max = Math.max(1, ...buckets.map((b) => b.total));

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Analytics</h1>

      {loading && <p className="text-muted-foreground">Loading analytics…</p>}

      {error && (
        <div className="rounded-xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="rounded-3xl bg-card p-6 shadow-soft">
            <h2 className="font-bold">Revenue · last 7 days</h2>
            <div className="mt-6 flex h-48 items-end gap-3">
              {buckets.map((b, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-2">
                  <div className="relative flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t-xl bg-gradient-hero transition-all"
                      style={{ height: `${(b.total / max) * 100}%`, minHeight: "8px" }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-muted-foreground">{b.label}</span>
                  <span className="text-[10px] text-muted-foreground">{formatPrice(b.total)}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl bg-card p-6 shadow-soft">
            <h2 className="font-bold">Top sellers · last 7 days</h2>
            {top.length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No sales data yet.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {top.map(({ id, name, image_url, qty }, i) => (
                  <li key={id} className="flex items-center gap-3">
                    <span className="w-6 text-sm font-bold text-muted-foreground">#{i + 1}</span>
                    {image_url ? (
                      <img
                        src={image_url}
                        alt={name}
                        className="h-10 w-10 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-lg">
                        🍽️
                      </div>
                    )}
                    <p className="flex-1 font-semibold">{name}</p>
                    <span className="text-sm font-bold text-primary">{qty} sold</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}