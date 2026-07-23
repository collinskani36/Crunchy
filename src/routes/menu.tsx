import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { useState, useEffect } from "react";
import { PageShell } from "@/components/PageShell";
import { FoodCard } from "@/components/FoodCard";
import { categories as defaultCategories, type Category, type Food } from "@/lib/data";
import type { DbFood } from "@/types/supabase";
import { supabase } from "@/lib/supabaseClient";

// ─── Types matching your Supabase schema ────────────────────────────────────
// Using shared app types for foods and categories.

// ─── Route ───────────────────────────────────────────────────────────────────
type MenuSearch = { category?: string; q?: string };

export const Route = createFileRoute("/menu")({
  validateSearch: (s: Record<string, unknown>): MenuSearch => ({
    category: typeof s.category === "string" ? s.category : undefined,
    q: typeof s.q === "string" ? s.q : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Menu — Afrikaana" },
      {
        name: "description",
        content:
          "Browse our full menu of grilled meals, burgers, pizza, healthy bowls and more.",
      },
    ],
  }),
  component: MenuPage,
});

// ─── Component ───────────────────────────────────────────────────────────────
function MenuPage() {
  const { category } = Route.useSearch();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string | undefined>(category);

  const [categories, setCategories] = useState<Category[]>([]);
  const [foods, setFoods] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch categories + foods in parallel on mount
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);

      const [catRes, foodRes] = await Promise.all([
        supabase
          .from("categories")
          .select("id, name, emoji, image_url, sort_order")
          .eq("is_active", true)
          .order("sort_order", { ascending: true }) as unknown as {
          data: Category[] | null;
          error: Error | null;
        },

        supabase
          .from("foods")
          .select(
            "id, name, description, price, category_id, image_url, rating, prep_time, is_popular, is_available, tags"
          )
          .eq("is_available", true)
          .order("name", { ascending: true }) as unknown as {
          data: DbFood[] | null;
          error: Error | null;
        },
      ]);

      if (catRes.error || foodRes.error) {
        setError("Failed to load menu. Please try again.");
        setLoading(false);
        return;
      }

      setCategories(catRes.data ?? []);
      setFoods(
        (foodRes.data ?? []).map((row) => {
          const match = defaultCategories.find((c) => c.id === row.category_id);
          return {
            ...row,
            categoryId: row.category_id,
            prepTime: row.prep_time ?? "",
            emoji: match?.emoji ?? "🍽️",
            gradient: match?.gradient ?? "from-amber-400 to-orange-500",
            rating: row.rating ?? 0,
            tags: row.tags ?? [],
          };
        })
      );
      setLoading(false);
    }

    fetchData();
  }, []);

  // Client-side filter (search + category tab)
  const filtered = foods.filter((f) => {
    if (cat && f.category_id !== cat) return false;
    if (q && !f.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  // ── Skeleton loader ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <PageShell>
        <div className="mb-6">
          <h1 className="text-3xl font-bold md:text-4xl">Our menu</h1>
          <p className="text-muted-foreground">Crafted daily by our chefs.</p>
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-56 animate-pulse rounded-2xl bg-card shadow-soft"
            />
          ))}
        </div>
      </PageShell>
    );
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <PageShell>
        <div className="rounded-3xl bg-card p-12 text-center shadow-soft">
          <p className="text-5xl">⚠️</p>
          <p className="mt-3 font-semibold">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 rounded-full bg-charcoal px-6 py-2 text-sm font-semibold text-charcoal-foreground"
          >
            Retry
          </button>
        </div>
      </PageShell>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <PageShell>
      <div className="mb-6">
        <h1 className="text-3xl font-bold md:text-4xl">Our menu</h1>
        <p className="text-muted-foreground">Crafted daily by our chefs.</p>
      </div>

      {/* Search + category filter bar */}
      <div className="sticky top-16 z-30 -mx-4 mb-6 bg-background/95 px-4 py-3 backdrop-blur-xl md:mx-0 md:rounded-2xl md:bg-transparent md:px-0">
        <div className="flex items-center gap-2 rounded-full border border-border bg-card p-1.5 shadow-soft">
          <Search className="ml-3 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search for dishes..."
            className="flex-1 bg-transparent text-sm focus:outline-none"
          />
        </div>
        <div className="scrollbar-hide -mx-1 mt-3 flex gap-2 overflow-x-auto px-1">
          <button
            onClick={() => setCat(undefined)}
            className={`shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-smooth ${
              !cat
                ? "bg-charcoal text-charcoal-foreground"
                : "bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            All
          </button>
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition-smooth ${
                cat === c.id
                  ? "bg-charcoal text-charcoal-foreground"
                  : "bg-card text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{c.emoji}</span> {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Food grid */}
      {filtered.length === 0 ? (
        <div className="rounded-3xl bg-card p-12 text-center shadow-soft">
          <p className="text-5xl">🔍</p>
          <p className="mt-3 font-semibold">No dishes found</p>
          <p className="text-sm text-muted-foreground">
            Try a different search or category.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
          {filtered.map((f) => (
            <FoodCard key={f.id} food={f} />
          ))}
        </div>
      )}

      <p className="mt-10 text-center text-xs text-muted-foreground">
        Looking for something else?{" "}
        <Link to="/" className="font-semibold text-primary">
          Back home
        </Link>
      </p>
    </PageShell>
  );
}