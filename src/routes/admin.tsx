import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  BarChart3,
  ChefHat,
  LayoutDashboard,
  ShoppingBag,
  Truck,
  Users,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { supabase } from "@/lib/supabaseClient";
import { Capacitor } from "@capacitor/core";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

async function registerAdminDeviceToken(navigate: ReturnType<typeof useNavigate>) {
  // Only attempt this inside the actual Capacitor app, not the website
  if (!Capacitor.isNativePlatform()) return;

  try {
    // Dynamic import keeps this out of the Vercel/website build entirely
    const { PushNotifications } = await import("@capacitor/push-notifications");

    const permStatus = await PushNotifications.checkPermissions();
    let granted = permStatus.receive === "granted";

    if (!granted) {
      const req = await PushNotifications.requestPermissions();
      granted = req.receive === "granted";
    }

    if (!granted) return;

    // REQUIRED on Android 8+ (API 26+): if the FCM payload's channel_id
    // doesn't correspond to a channel that exists on-device, the OS
    // silently drops the notification entirely — no error, nothing.
    // This must match "channel_id": "orders" set in the edge function.
    await PushNotifications.createChannel({
      id: "orders",
      name: "New Orders",
      description: "Notifications for new incoming orders",
      importance: 5, // IMPORTANCE_HIGH — needed for heads-up + sound
      visibility: 1,
      sound: "default",
      vibration: true,
    });

    // Listeners are attached BEFORE register() to avoid a race condition
    // where the native "registration" event could fire before we're
    // listening for it.
    PushNotifications.addListener("registration", async (token) => {
      const { error } = await supabase
        .from("device_tokens")
        .upsert(
          { token: token.value, role: "admin", device_id: token.value },
          { onConflict: "token" }
        );

      if (error) {
        console.error("Failed to save admin device token:", error.message);
      }
    });

    PushNotifications.addListener("registrationError", (err) => {
      console.error("Push registration error:", err);
    });

    // Fires when a push arrives while the app is OPEN (foreground).
    // Android doesn't auto-show a system notification banner for
    // foreground pushes, so this is also where you could show an
    // in-app toast using notification.data.items_summary if desired.
    PushNotifications.addListener("pushNotificationReceived", async (notification) => {
      // Distinct double-buzz for "new order" — easier to notice without
      // looking at the screen than a single generic tap.
      await Haptics.impact({ style: ImpactStyle.Medium });
      setTimeout(() => Haptics.impact({ style: ImpactStyle.Light }), 150);

      console.log("Push received in foreground:", notification);
    });

    // Fires when the user TAPS the notification (app was backgrounded
    // or closed). notification.data carries whatever was set in the
    // edge function's dataPayload (order_id, items_summary, etc).
    PushNotifications.addListener("pushNotificationActionPerformed", (action) => {
      const orderId = action.notification.data?.order_id;
      if (orderId) {
        // Orders live on one list page (accordion rows, no separate detail
        // route) — so we navigate there and pass the order id as a search
        // param. The orders page auto-expands and scrolls to it.
        navigate({ to: "/admin/orders", search: { highlight: orderId } });
      } else {
        navigate({ to: "/admin/orders" });
      }
    });

    await PushNotifications.register();
  } catch (err) {
    console.error("Push notification setup failed:", err);
  }
}

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [{ title: "Admin — Afrikaana" }],
  }),
  component: AdminLayout,
});

type NavItem = {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};

const navItems: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { to: "/admin/menu", label: "Menu", icon: ChefHat },
  { to: "/admin/customers", label: "Customers", icon: Users },
  { to: "/admin/deliveries", label: "Deliveries", icon: Truck },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
];

function AdminLayout() {
  const navigate = useNavigate();
  const path = useRouterState({
    select: (s) => s.location.pathname,
  });

  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
      if (data.session) {
        registerAdminDeviceToken(navigate);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        registerAdminDeviceToken(navigate);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();

    setLoggingIn(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoggingIn(false);

    if (error) {
      setError(error.message);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-4">
        <div className="w-full max-w-md rounded-3xl bg-card p-8 shadow-soft">
          <div className="mb-8 text-center">
            <Logo />
            <h1 className="mt-6 text-3xl font-bold">
              Admin Login
            </h1>
            <p className="mt-2 text-muted-foreground">
              Sign in to access the admin console.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium">
                Email
              </label>

              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border px-4 py-3"
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Password
              </label>

              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border px-4 py-3"
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-100 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <button
              disabled={loggingIn}
              className="w-full rounded-xl bg-primary py-3 font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {loggingIn ? "Signing in..." : "Sign In"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/40">
      <div className="mx-auto flex max-w-[1500px] gap-6 p-4 md:p-6">
        <aside className="hidden w-60 shrink-0 lg:block">
          <div className="sticky top-6 rounded-3xl bg-card p-5 shadow-soft">
            <Link to="/">
              <Logo />
            </Link>

            <p className="mt-1 text-xs text-muted-foreground">
              Admin console
            </p>

            <nav className="mt-6 space-y-1">
              {navItems.map((n) => {
                const Icon = n.icon;
                const active = n.exact
                  ? path === n.to
                  : path.startsWith(n.to);

                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-smooth ${
                      active
                        ? "bg-primary text-primary-foreground shadow-glow"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {n.label}
                  </Link>
                );
              })}
            </nav>

            <button
              onClick={handleLogout}
              className="mt-6 w-full rounded-xl bg-red-500 px-3 py-2 text-sm font-semibold text-white hover:bg-red-600"
            >
              Logout
            </button>

            <Link
              to="/"
              className="mt-3 block rounded-xl bg-secondary px-3 py-2 text-center text-xs font-semibold text-muted-foreground transition-smooth hover:text-foreground"
            >
              ← Back to site
            </Link>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="scrollbar-hide -mx-1 mb-4 flex gap-2 overflow-x-auto px-1 lg:hidden">
            {navItems.map((n) => {
              const Icon = n.icon;
              const active = n.exact
                ? path === n.to
                : path.startsWith(n.to);

              return (
                <Link
                  key={n.to}
                  to={n.to}
                  className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold transition-smooth ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {n.label}
                </Link>
              );
            })}
          </div>

          <Outlet />
        </main>
      </div>
    </div>
  );
}