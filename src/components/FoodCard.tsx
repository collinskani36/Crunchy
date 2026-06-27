import { Link } from "@tanstack/react-router";
import { Heart, Star, Clock } from "lucide-react";
import { useStore } from "@/lib/store";
import { formatPrice } from "@/lib/utils";
import type { Food } from "@/lib/data";

interface FoodCardProps {
  food: Food;
}

export function FoodCard({ food }: FoodCardProps) {
  const toggleFavorite = useStore((s) => s.toggleFavorite);
  const isFav = useStore((s) => s.favorites.includes(food.id));
  const addToCart = useStore((s) => s.addToCart);
  const cartFood = food as Parameters<typeof addToCart>[0];

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-3xl bg-card shadow-soft transition-smooth hover:-translate-y-1 hover:shadow-card">
      {/* Image / Emoji placeholder */}
      <Link to="/food/$id" params={{ id: food.id }} className="block">
        <div className="relative flex aspect-square items-center justify-center overflow-hidden bg-gradient-to-br from-primary/10 to-accent/10 text-[5rem]">
          {food.image_url ? (
            <img
              src={food.image_url}
              alt={food.name}
              className="h-full w-full object-cover transition-smooth group-hover:scale-105"
            />
          ) : (
            <span className="drop-shadow-lg">🍽️</span>
          )}

          {food.is_popular && (
            <span className="absolute left-3 top-3 rounded-full bg-accent/90 px-2.5 py-0.5 text-xs font-bold text-white backdrop-blur">
              Popular
            </span>
          )}

          {!food.is_available && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm">
              <span className="rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">
                Unavailable
              </span>
            </div>
          )}
        </div>
      </Link>

      {/* Favourite button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          toggleFavorite(food.id);
        }}
        className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-white/90 backdrop-blur transition-smooth hover:scale-110"
      >
        <Heart
          className={`h-4 w-4 ${isFav ? "fill-destructive text-destructive" : "text-charcoal"}`}
        />
      </button>

      {/* Content */}
      <div className="flex flex-1 flex-col gap-2 p-3">
        <Link to="/food/$id" params={{ id: food.id }}>
          <h3 className="truncate text-sm font-bold leading-tight hover:text-primary">
            {food.name}
          </h3>
        </Link>

        <p className="line-clamp-2 text-xs text-muted-foreground">
          {food.description}
        </p>

        {/* Rating & prep time */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-0.5 font-semibold text-foreground">
            <Star className="h-3 w-3 fill-accent text-accent" />
            {food.rating?.toFixed(1) ?? "4.0"}
          </span>
          {food.prep_time && (
            <>
              <span>·</span>
              <span className="flex items-center gap-0.5">
                <Clock className="h-3 w-3 text-primary" />
                {food.prep_time}
              </span>
            </>
          )}
        </div>

        {/* Price + quick-add */}
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          <span className="text-sm font-bold">{formatPrice(food.price)}</span>

          <button
            onClick={() => addToCart(cartFood, 1)}
            disabled={!food.is_available}
            className={`rounded-full px-3 py-1.5 text-xs font-bold transition-smooth ${
              food.is_available
                ? "bg-primary text-primary-foreground hover:bg-primary/90 hover:-translate-y-0.5"
                : "cursor-not-allowed bg-muted text-muted-foreground"
            }`}
          >
            + Add
          </button>
        </div>
      </div>
    </div>
  );
}