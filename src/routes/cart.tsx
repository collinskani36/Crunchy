import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { PageShell } from "@/components/PageShell";
import { formatPrice } from "@/lib/utils";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Your cart — Crunchy Inn" }] }),
  component: CartPage,
});

function CartPage() {
  const cart = useStore((s) => s.cart);
  const setQty = useStore((s) => s.setQty);
  const removeFromCart = useStore((s) => s.removeFromCart);
  const subtotal = cart.reduce((s, c) => s + c.food.price * c.qty, 0);

  if (cart.length === 0) {
    return (
      <PageShell>
        <div className="mx-auto max-w-md rounded-3xl bg-card p-10 text-center shadow-soft">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-gradient-hero text-white shadow-glow">
            <ShoppingBag className="h-9 w-9" />
          </div>
          <h1 className="mt-5 text-2xl font-bold">Your cart is empty</h1>
          <p className="mt-2 text-sm text-muted-foreground">Add some delicious dishes to get started.</p>
          <Link to="/menu" className="mt-6 inline-block rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-glow transition-smooth hover:-translate-y-0.5">
            Browse menu
          </Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell>
      <h1 className="mb-6 text-3xl font-bold md:text-4xl">Your cart</h1>
      <div className="grid gap-6 md:grid-cols-[1fr,360px]">
        <div className="space-y-3">
          {cart.map((c) => {
            const food = c.food as typeof c.food & { emoji?: string; gradient?: string };

            return (
              <div key={c.food.id} className="flex items-center gap-4 rounded-2xl bg-card p-3 shadow-soft">
                <div
                  className={`grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${food.gradient ?? "from-amber-400 to-orange-500"} text-4xl`}
                >
                  {food.emoji ?? "🍽️"}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="line-clamp-1 font-semibold">{c.food.name}</p>
                  <p className="text-sm text-muted-foreground">{formatPrice(c.food.price)}</p>

                  <div className="mt-2 flex items-center gap-2">
                    <div className="flex items-center gap-2 rounded-full bg-secondary p-1">
                      <button
                        onClick={() => setQty(c.food.id, c.qty - 1)}
                        className="grid h-7 w-7 place-items-center rounded-full bg-card transition-smooth hover:bg-primary hover:text-primary-foreground"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-5 text-center text-sm font-bold">{c.qty}</span>
                      <button
                        onClick={() => setQty(c.food.id, c.qty + 1)}
                        className="grid h-7 w-7 place-items-center rounded-full bg-card transition-smooth hover:bg-primary hover:text-primary-foreground"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                    <button
                      onClick={() => removeFromCart(c.food.id)}
                      className="ml-auto grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-smooth hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <p className="hidden text-right font-bold sm:block">{formatPrice(c.food.price * c.qty)}</p>
              </div>
            );
          })}
        </div>

        <aside className="h-fit rounded-3xl bg-card p-6 shadow-card md:sticky md:top-24">
          <h2 className="text-lg font-bold">Order summary</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-semibold">{formatPrice(subtotal)}</span>
            </div>
            <div className="my-3 border-t border-border" />
            <div className="flex justify-between text-lg font-bold">
              <span>Total</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            <p className="text-xs text-muted-foreground">Delivery fee calculated at checkout</p>
          </div>
          <Link to="/checkout" className="mt-6 block w-full rounded-full bg-primary py-3.5 text-center text-sm font-bold text-primary-foreground shadow-glow transition-smooth hover:-translate-y-0.5">
            Continue to checkout
          </Link>
          <Link to="/menu" className="mt-2 block text-center text-xs font-medium text-muted-foreground hover:text-foreground">
            + Add more items
          </Link>
        </aside>
      </div>
    </PageShell>
  );
}