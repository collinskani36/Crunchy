import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Search, ShoppingBag, User } from "lucide-react";
import { useStore } from "@/lib/store";

export function MobileNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const count = useStore((s) => s.cart.reduce((a, c) => a + c.qty, 0));
  const items = [
    { to: "/", label: "Home", icon: Home, badge: 0 },
    { to: "/menu", label: "Menu", icon: Search, badge: 0 },
    { to: "/cart", label: "Cart", icon: ShoppingBag, badge: count },
    { to: "/account", label: "Account", icon: User, badge: 0 },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-xl md:hidden">
      <div className="mx-auto flex max-w-md items-center justify-around px-2 py-2">
        {items.map((it) => {
          const Icon = it.icon;
          const active = path === it.to;
          return (
            <Link
              key={it.to}
              to={it.to}
              className={`relative flex flex-1 flex-col items-center gap-1 rounded-2xl px-3 py-2 transition-smooth ${active ? "text-primary" : "text-muted-foreground"}`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-[10px] font-semibold uppercase tracking-wide">{it.label}</span>
              {it.badge ? (
                <span className="absolute right-3 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-accent px-1 text-[10px] font-bold text-accent-foreground">
                  {it.badge}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}