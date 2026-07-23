import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Clock, MapPin, Search, ShieldCheck, Truck } from "lucide-react";
import { useEffect, useState } from "react";
import heroImage from "@/assets/hero-grill.jpg";
import { PageShell } from "@/components/PageShell";
import { FoodCard } from "@/components/FoodCard";
import { supabase } from "@/lib/supabaseClient";
import type { Food } from "@/lib/store";

// ── types matching the DB rows ──────────────────────────────────────────────
type DbCategory = {
  id: string;
  name: string;
  emoji: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
};

type DbFood = {
  id: string;
  name: string;
  description: string;
  price: number;
  category_id: string;
  image_url: string | null;
  rating: number | null;
  prep_time: string | null;
  is_popular: boolean;
  is_available: boolean;
  tags: string[] | null;
  created_at: string;
  updated_at: string;
};

// ── map DB row → app Food type ───────────────────────────────────────────────
function mapFood(row: DbFood): Food {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: row.price,
    category_id: row.category_id,
    image_url: row.image_url,
    rating: row.rating ?? 0,
    prep_time: row.prep_time ?? null,
    is_popular: row.is_popular,
    is_available: row.is_available,
    tags: row.tags ?? [],
    created_at: row.created_at,
    updated_at: row.updated_at,
    emoji: "🍽️",
    gradient: "from-orange-400 to-red-500",
  } as Food;
}

// ── map DB row → shape the categories section needs ─────────────────────────
type AppCategory = {
  id: string;
  name: string;
  emoji: string;
  gradient: string;
};

const GRADIENTS = [
  "from-orange-400 to-red-500",
  "from-yellow-400 to-orange-500",
  "from-green-400 to-emerald-500",
  "from-blue-400 to-indigo-500",
  "from-purple-400 to-pink-500",
  "from-pink-400 to-rose-500",
  "from-teal-400 to-cyan-500",
  "from-amber-400 to-yellow-500",
];

function mapCategory(row: DbCategory, index: number): AppCategory {
  return {
    id: row.id,
    name: row.name,
    emoji: row.emoji,
    gradient: GRADIENTS[index % GRADIENTS.length],
  };
}

// ── route ────────────────────────────────────────────────────────────────────
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Afrikaana Hotel — Fresh food, fast delivery" },
      { name: "description", content: "Order flame-grilled meals, burgers, and healthy bowls delivered hot in 30 minutes." },
      { property: "og:title", content: "Afrikaana— Fresh food, fast delivery" },
      { property: "og:description", content: "Order flame-grilled meals, burgers, and healthy bowls delivered hot in 30 minutes." },
    ],
  }),
  component: Home,
});

function Home() {
  const [categories, setCategories] = useState<AppCategory[]>([]);
  const [popular, setPopular] = useState<Food[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);

      const [{ data: catRows }, { data: foodRows }] = await Promise.all([
        supabase
          .from("categories")
          .select("id, name, emoji, image_url, sort_order, is_active")
          .eq("is_active", true)
          .order("sort_order"),
        supabase
          .from("foods")
          .select("id, name, description, price, category_id, image_url, rating, prep_time, is_popular, is_available, tags, created_at, updated_at")
          .eq("is_popular", true)
          .eq("is_available", true),
      ]);

      if (catRows) setCategories((catRows as DbCategory[]).map(mapCategory));
      if (foodRows) setPopular((foodRows as DbFood[]).map(mapFood));

      setLoading(false);
    }

    fetchData();
  }, []);

  return (
    // overflow-x-hidden on the root prevents any child from causing horizontal scroll
    <PageShell className="overflow-x-hidden">

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden rounded-2xl bg-charcoal text-charcoal-foreground shadow-card md:rounded-[2.5rem]">
        <img
          src={heroImage}
          alt="Grilled platter"
          className="absolute inset-0 h-full w-full object-cover opacity-60"
        />
        {/* gradient overlay — covers bottom too on mobile so text stays readable */}
        <div className="absolute inset-0 bg-gradient-to-r from-charcoal via-charcoal/85 to-charcoal/40 md:to-transparent" />

        <div className="relative flex flex-col gap-5 p-5 md:grid md:grid-cols-2 md:gap-10 md:p-14">
          <div className="flex flex-col justify-center gap-4 animate-fade-up">
            {/* eyebrow pill */}
            <span className="w-fit rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider backdrop-blur">
              🔥 Fresh from the grill
            </span>

            {/* headline — smaller on mobile to avoid overflow */}
            <h1 className="text-3xl font-bold leading-[1.1] sm:text-4xl md:text-6xl md:leading-[1.05]">
              Crave it.<br />
              <span className="bg-gradient-warm bg-clip-text text-transparent">
                Get it in 30.
              </span>
            </h1>

            <p className="max-w-sm text-sm text-white/75 sm:text-base md:max-w-md md:text-lg">
              Flame-grilled meals, juicy burgers, and farm-fresh bowls — delivered hot to your door.
            </p>

            {/* search bar — min-w-0 + flex-1 prevent overflow on narrow screens */}
            <div className="flex w-full items-center gap-2 rounded-full bg-white p-1.5 shadow-glow">
              <div className="flex shrink-0 items-center gap-1.5 pl-3 text-charcoal">
                <MapPin className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Nairobi</span>
              </div>
              <div className="mx-1 h-5 w-px shrink-0 bg-border" />
              <input
                placeholder="Search food..."
                className="min-w-0 flex-1 bg-transparent text-sm text-charcoal placeholder:text-charcoal/50 focus:outline-none"
              />
              <Link
                to="/menu"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition-smooth hover:bg-primary/90 md:h-10 md:w-10"
              >
                <Search className="h-4 w-4" />
              </Link>
            </div>

            {/* feature pills — wrap on very small screens */}
            <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1 text-xs text-white/80 sm:text-sm">
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 shrink-0 text-accent" />
                30-min delivery
              </div>
              <div className="flex items-center gap-1.5">
                <Truck className="h-3.5 w-3.5 shrink-0 text-accent" />
                Free over KES 500
              </div>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-accent" />
                Live tracking
              </div>
            </div>
          </div>

          {/* right column — only visible on desktop */}
          <div className="hidden md:block" />
        </div>
      </section>

      {/* ── Categories ───────────────────────────────────────────────────── */}
      <section className="mt-8 md:mt-10">
        <div className="mb-4 flex items-end justify-between md:mb-5">
          <div>
            <h2 className="text-xl font-bold md:text-3xl">Browse categories</h2>
            <p className="text-xs text-muted-foreground md:text-sm">Pick a vibe, we'll do the rest.</p>
          </div>
          <Link
            to="/menu"
            className="hidden items-center gap-1 text-sm font-semibold text-primary md:flex"
          >
            See all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          /* skeleton — 4 cols on mobile, 8 on desktop */
          <div className="grid grid-cols-4 gap-2 md:grid-cols-8 md:gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-2 rounded-2xl bg-card p-2 shadow-soft animate-pulse md:p-3"
              >
                <div className="h-12 w-12 rounded-xl bg-muted md:h-14 md:w-14 md:rounded-2xl" />
                <div className="h-2.5 w-10 rounded bg-muted md:h-3 md:w-12" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 md:grid-cols-8 md:gap-3">
            {categories.map((c) => (
              <Link
                key={c.id}
                to="/menu"
                search={{ category: c.id }}
                className="group flex flex-col items-center gap-1.5 rounded-2xl bg-card p-2 shadow-soft transition-smooth hover:-translate-y-1 hover:shadow-card active:scale-95 md:gap-2 md:p-3"
              >
                <div
                  className={`grid h-12 w-12 place-items-center rounded-xl bg-gradient-to-br ${c.gradient} text-xl shadow-soft transition-smooth group-hover:scale-110 md:h-14 md:w-14 md:rounded-2xl md:text-2xl`}
                >
                  {c.emoji}
                </div>
                <span className="text-center text-[10px] font-semibold leading-tight md:text-xs">
                  {c.name}
                </span>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* ── Popular ──────────────────────────────────────────────────────── */}
      <section className="mt-10 md:mt-12">
        <div className="mb-4 flex items-end justify-between md:mb-5">
          <div>
            <h2 className="text-xl font-bold md:text-3xl">Popular right now</h2>
            <p className="text-xs text-muted-foreground md:text-sm">Most ordered this week.</p>
          </div>
          <Link to="/menu" className="text-sm font-semibold text-primary">
            View menu →
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-card shadow-soft animate-pulse">
                <div className="h-36 rounded-t-2xl bg-muted md:h-40" />
                <div className="space-y-2 p-3">
                  <div className="h-3.5 w-3/4 rounded bg-muted" />
                  <div className="h-3 w-full rounded bg-muted" />
                  <div className="h-3.5 w-1/3 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 lg:grid-cols-4">
            {popular.map((f) => (
              <FoodCard key={f.id} food={f} />
            ))}
          </div>
        )}
      </section>

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section className="mt-12 overflow-hidden rounded-2xl bg-gradient-fresh p-6 text-white shadow-card md:mt-14 md:rounded-3xl md:p-12">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-6">
          <div>
            <h3 className="text-lg font-bold leading-snug sm:text-xl md:text-3xl">
              Hungry? Save 20% on your first order.
            </h3>
            <p className="mt-1 text-sm text-white/85">
              Use code <span className="font-bold">FARM20</span> at checkout.
            </p>
          </div>
          <Link
            to="/menu"
            className="inline-flex w-fit items-center gap-2 rounded-full bg-charcoal px-5 py-2.5 text-sm font-bold text-white shadow-soft transition-smooth hover:-translate-y-0.5 active:scale-95 md:px-6 md:py-3"
          >
            Order now <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </PageShell>
  );
}