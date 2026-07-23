import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { useStore, CUSTOMER_ID_KEY, setCustomerId } from "@/lib/store";
import { supabase } from "@/lib/supabaseClient";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Afrikaana" }] }),
  component: LoginPage,
});

type Mode = "signin" | "signup";

type CustomerProfileRow = {
  id: string;
  name: string | null;
  email: string | null;
};

function LoginPage() {
  const navigate = useNavigate();
  const login = useStore((s) => s.login);
  const setCustomerProfileId = useStore((s) => s.setCustomerProfileId);
  const clearLocalIdentityData = useStore((s) => s.clearLocalIdentityData);

  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
  }

  // Shared final step for both sign-in and sign-up: point this device's
  // identity at the resolved profile, then update the store and navigate.
  //
  // If the resolved profile is DIFFERENT from whatever was already active on
  // this device, we wipe local favorites/addresses/orders first. Without
  // this, two bugs happen: (1) account.tsx's bootstrap effect merges local
  // favorites into the server and pushes local-only ones up — which would
  // contaminate the incoming account with a stranger's favorites; (2) the
  // device's saved order-id list would keep showing the previous identity's
  // orders alongside the new one. Cart is deliberately left untouched —
  // that's a "forget me" action reserved for logout(), not sign-in.
  function completeSignIn(id: string, resolvedName: string | undefined, resolvedEmail: string) {
    const currentId = typeof window !== "undefined" ? localStorage.getItem(CUSTOMER_ID_KEY) : null;

    if (currentId !== id) {
      clearLocalIdentityData();
    }

    setCustomerId(id);
    setCustomerProfileId(id);
    login(resolvedEmail, resolvedName, id);

    setSubmitting(false);
    navigate({ to: "/account" });
  }

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError("Enter your email.");
      return;
    }

    setSubmitting(true);

    // Ordered by created_at + limited to 1 as a defensive tie-break in case
    // duplicate emails exist before the unique constraint migration runs.
    const { data, error: lookupError } = await (supabase as any)
      .from("customer_profiles")
      .select("id, name, email")
      .eq("email", trimmedEmail)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (lookupError) {
      console.error("customer_profiles lookup error:", lookupError);
      setError("Something went wrong. Please try again.");
      setSubmitting(false);
      return;
    }

    if (!data) {
      setError("No account found with that email. Sign up below.");
      setSubmitting(false);
      return;
    }

    const profile = data as CustomerProfileRow;
    completeSignIn(profile.id, profile.name ?? undefined, trimmedEmail);
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();
    if (!trimmedEmail) {
      setError("Enter your email.");
      return;
    }
    if (!trimmedName) {
      setError("Enter your name.");
      return;
    }

    setSubmitting(true);

    // Fresh id — deliberately NOT reusing whatever guest device id might
    // already be sitting in localStorage, so a shared device never
    // accidentally links a new signup to a stray previous guest profile.
    const newId = crypto.randomUUID();

    const { error: insertError } = await (supabase as any)
      .from("customer_profiles")
      .insert({ id: newId, email: trimmedEmail, name: trimmedName });

    if (insertError) {
      console.error("customer_profiles insert error:", insertError);
      // 23505 = Postgres unique_violation (email already taken)
      if (insertError.code === "23505") {
        setError("An account with that email already exists. Try signing in instead.");
      } else {
        setError("Failed to create account. Please try again.");
      }
      setSubmitting(false);
      return;
    }

    completeSignIn(newId, trimmedName, trimmedEmail);
  }

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="relative hidden bg-gradient-hero p-12 text-white md:flex md:flex-col md:justify-between">
        <Logo className="text-white [&_span:last-child]:text-white" />
        <div>
          <h2 className="text-4xl font-bold leading-tight">Welcome to the freshest grill in town.</h2>
          <p className="mt-3 text-white/80">Sign in to track orders, save addresses and earn rewards.</p>
        </div>
        <p className="text-xs text-white/60">© Afrikaana 2026</p>
      </div>

      <div className="flex flex-col justify-center px-6 py-12 md:px-16">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 md:hidden"><Logo /></div>

          <div className="mb-6 flex gap-2 rounded-full bg-secondary p-1">
            <button
              type="button"
              onClick={() => switchMode("signin")}
              className={`flex-1 rounded-full py-2 text-sm font-bold transition-smooth ${
                mode === "signin" ? "bg-card shadow-soft" : "text-muted-foreground"
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => switchMode("signup")}
              className={`flex-1 rounded-full py-2 text-sm font-bold transition-smooth ${
                mode === "signup" ? "bg-card shadow-soft" : "text-muted-foreground"
              }`}
            >
              Sign up
            </button>
          </div>

          {mode === "signin" ? (
            <>
              <h1 className="text-3xl font-bold">Sign in</h1>
              <p className="mt-1 text-sm text-muted-foreground">Welcome back, hungry friend.</p>

              <form onSubmit={handleSignIn} className="mt-6 space-y-4">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-muted-foreground">Email</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none"
                  />
                </label>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-full bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-glow transition-smooth hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Signing in…" : "Sign in"}
                </button>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold">Sign up</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Create an account to track orders and save favorites.
              </p>

              <form onSubmit={handleSignUp} className="mt-6 space-y-4">
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-muted-foreground">Name</span>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-semibold text-muted-foreground">Email</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none"
                  />
                </label>

                {error && <p className="text-sm text-destructive">{error}</p>}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-full bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-glow transition-smooth hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Creating account…" : "Create account"}
                </button>
              </form>
            </>
          )}

          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing you agree to our Terms & Privacy.
          </p>
        </div>
      </div>
    </div>
  );
}