import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Clock, Heart, Minus, Plus, Star } from "lucide-react";
import { useState, useEffect } from "react";
import { PageShell } from "@/components/PageShell";
import { FoodCard } from "@/components/FoodCard";
import { useStore } from "@/lib/store";
import { supabase } from "@/lib/supabaseClient";
import { formatPrice } from "@/lib/utils";
import type { Food as AppFood } from "@/lib/data";

// Type for food rows returned by Supabase
interface DbFood {
  id: string;
  name: string;
  description: string;
  price: number;
  category_id: string;
  image_url: string | null;
  rating: number;
  prep_time: string | null;
  is_popular: boolean;
  is_available: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export const Route = createFileRoute("/food/$id")({
  component: FoodDetail,
  notFoundComponent: () => <div className="p-10 text-center">Dish not found.</div>,
  errorComponent: ({ error }) => <div className="p-10 text-center">{error.message}</div>,
});

function FoodDetail() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const addToCart = useStore((s) => s.addToCart);
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const isFav = useStore((s) => s.favorites.includes(id));
  const [qty, setQty] = useState(1);
  const [food, setFood] = useState<DbFood | null>(null);
  const [relatedFoods, setRelatedFoods] = useState<AppFood[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function mapDbFoodToAppFood(row: DbFood): AppFood {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      price: row.price,
      categoryId: row.category_id,
      emoji: "🍽️",
      gradient: "from-orange-400 to-red-500",
      rating: row.rating,
      prepTime: row.prep_time ?? "",
      popular: row.is_popular,
      tags: row.tags ?? [],
      image_url: row.image_url,
      prep_time: row.prep_time,
      is_popular: row.is_popular,
      is_available: row.is_available,
      created_at: row.created_at,
      updated_at: row.updated_at,
    } as AppFood;
  }

  useEffect(() => {
    fetchFoodDetails();
  }, [id]);

  async function fetchFoodDetails() {
    try {
      setLoading(true);
      setError(null);

      // Fetch the main food item
      const foodResult = await supabase
        .from("foods")
        .select("id, name, description, price, category_id, image_url, rating, prep_time, is_popular, is_available, tags, created_at, updated_at")
        .eq("id", id)
        .single();

      if (foodResult.error) throw foodResult.error;
      const foodData = foodResult.data as DbFood | null;
      if (!foodData) throw new Error("Food not found");

      setFood(foodData);

      // Fetch related foods from same category
      const relatedResult = await supabase
        .from("foods")
        .select("id, name, description, price, category_id, image_url, rating, prep_time, is_popular, is_available, tags, created_at, updated_at")
        .eq("category_id", foodData.category_id)
        .neq("id", id)
        .limit(4);

      if (relatedResult.error) throw relatedResult.error;
      const relatedData = relatedResult.data as DbFood[] | null;
      setRelatedFoods((relatedData ?? []).map(mapDbFoodToAppFood));

    } catch (err: any) {
      console.error("Error fetching food:", err);
      setError(err.message || "Failed to load food details");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <PageShell>
        <div className="flex h-96 items-center justify-center">
          <div className="text-center">
            <div className="mb-4 h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-muted-foreground">Loading dish...</p>
          </div>
        </div>
      </PageShell>
    );
  }

  if (error || !food) {
    return (
      <PageShell>
        <div className="py-10 text-center">
          <p className="text-muted-foreground">{error || "Dish not found."}</p>
          <Link to="/menu" className="mt-4 inline-block text-primary hover:underline">
            Back to menu
          </Link>
        </div>
      </PageShell>
    );
  }

  // Generate gradient based on food name or use default
  const gradient = `from-${food.name.length % 6}/10 to-${(food.name.length % 6) + 1}/10`;

  return (
    <PageShell>
      <Link
        to="/menu"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to menu
      </Link>

      <div className="grid gap-8 md:grid-cols-2">
        <div className={`relative flex aspect-square items-center justify-center overflow-hidden rounded-[2rem] bg-gradient-to-br ${gradient} text-[12rem] shadow-card`}>
          {food.image_url ? (
            <img 
              src={food.image_url} 
              alt={food.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="drop-shadow-2xl">🍽️</span>
          )}
          <button
            onClick={() => toggleFavorite(food.id)}
            className="absolute right-5 top-5 grid h-12 w-12 place-items-center rounded-full bg-white/90 backdrop-blur transition-smooth hover:scale-110"
          >
            <Heart className={`h-5 w-5 ${isFav ? "fill-destructive text-destructive" : "text-charcoal"}`} />
          </button>
        </div>

        <div className="flex flex-col gap-5">
          <div>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {food.tags && food.tags.map((t) => (
                <span key={t} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                  {t}
                </span>
              ))}
              {food.is_popular && (
                <span className="rounded-full bg-accent/20 px-2.5 py-1 text-xs font-semibold text-accent">
                  Popular
                </span>
              )}
            </div>
            <h1 className="text-4xl font-bold md:text-5xl">{food.name}</h1>
            <p className="mt-3 text-muted-foreground">{food.description}</p>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 font-semibold">
              <Star className="h-4 w-4 fill-accent text-accent" /> {food.rating?.toFixed(1) || "4.0"}
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 font-semibold">
              <Clock className="h-4 w-4 text-primary" /> {food.prep_time || "15-20 min"}
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 font-semibold">
              {food.is_available ? "✅ Available" : "❌ Unavailable"}
            </div>
          </div>

          <div className="rounded-3xl bg-card p-5 shadow-soft">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 rounded-full bg-secondary p-1.5">
                <button 
                  onClick={() => setQty(Math.max(1, qty - 1))} 
                  className="grid h-9 w-9 place-items-center rounded-full bg-card text-foreground transition-smooth hover:bg-primary hover:text-primary-foreground"
                  disabled={!food.is_available}
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="w-6 text-center text-lg font-bold">{qty}</span>
                <button 
                  onClick={() => setQty(qty + 1)} 
                  className="grid h-9 w-9 place-items-center rounded-full bg-card text-foreground transition-smooth hover:bg-primary hover:text-primary-foreground"
                  disabled={!food.is_available}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{formatPrice(food.price * qty)}</p>
              </div>
            </div>
            <button
              onClick={() => {
                addToCart(food, qty);
                navigate({ to: "/cart" });
              }}
              disabled={!food.is_available}
              className={`mt-4 w-full rounded-full py-3.5 text-sm font-bold shadow-glow transition-smooth hover:-translate-y-0.5 ${
                food.is_available 
                  ? "bg-primary text-primary-foreground hover:bg-primary/90" 
                  : "cursor-not-allowed bg-muted text-muted-foreground"
              }`}
            >
              {food.is_available 
                ? `Add to cart — ${formatPrice(food.price * qty)}` 
                : "Currently Unavailable"}
            </button>
          </div>
        </div>
      </div>

      {relatedFoods.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-2xl font-bold">You may also like</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {relatedFoods.map((f) => (
              <FoodCard key={f.id} food={f} />
            ))}
          </div>
        </section>
      )}
    </PageShell>
  );
}