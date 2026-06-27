import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Heart, ShoppingBag, User as UserIcon } from "lucide-react";
import { Logo } from "./Logo";
import { useStore } from "@/lib/store";
import { useRef } from "react";

export function Header() {
  const cart = useStore((s) => s.cart);
  const user = useStore((s) => s.user);
  const path = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  const count = cart.reduce((a, c) => a + c.qty, 0);

  const tapCount = useRef(0);
  const tapTimer = useRef<number | null>(null);

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();

    tapCount.current++;

    if (tapTimer.current) {
      window.clearTimeout(tapTimer.current);
    }

    if (tapCount.current === 3) {
      tapCount.current = 0;
      navigate({ to: "/admin" });
      return;
    }

    tapTimer.current = window.setTimeout(() => {
      if (tapCount.current < 3) {
        navigate({ to: "/" });
      }
      tapCount.current = 0;
    }, 600);
  };

  const links = [
    { to: "/", label: "Home" },
    { to: "/menu", label: "Menu" },
    { to: "/orders", label: "Orders" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 md:px-6">
        <Link
          to="/"
          className="shrink-0"
          onClick={handleLogoClick}
        >
          <Logo />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((l) => {
            const active = path === l.to;

            return (
              <Link
                key={l.to}
                to={l.to}
                className={`rounded-full px-4 py-2 text-sm font-medium transition-smooth ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/account"
            className="grid h-10 w-10 place-items-center rounded-full bg-secondary text-foreground transition-smooth hover:bg-primary/10 hover:text-primary"
            aria-label="Favorites"
          >
            <Heart className="h-4 w-4" />
          </Link>

          <Link
            to="/cart"
            className="relative flex h-10 items-center gap-2 rounded-full bg-charcoal px-4 text-charcoal-foreground transition-smooth hover:opacity-90"
          >
            <ShoppingBag className="h-4 w-4" />
            <span className="text-sm font-semibold">{count}</span>
            {count > 0 && (
              <span className="absolute -right-1 -top-1 h-3 w-3 animate-pulse-dot rounded-full bg-accent ring-2 ring-background" />
            )}
          </Link>

          <Link
            to={user ? "/account" : "/login"}
            className="hidden h-10 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium transition-smooth hover:border-primary hover:text-primary md:flex"
          >
            <UserIcon className="h-4 w-4" />
            {user ? user.name.split(" ")[0] : "Sign in"}
          </Link>
        </div>
      </div>
    </header>
  );
}