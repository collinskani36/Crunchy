import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Logo } from "@/components/Logo";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/login")({
  head: () => ({ meta: [{ title: "Sign in — Crunchy Inn" }] }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const login = useStore((s) => s.login);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    login(email, name || undefined);
    navigate({ to: "/account" });
  };

  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="relative hidden bg-gradient-hero p-12 text-white md:flex md:flex-col md:justify-between">
        <Logo className="text-white [&_span:last-child]:text-white" />
        <div>
          <h2 className="text-4xl font-bold leading-tight">Welcome to the freshest grill in town.</h2>
          <p className="mt-3 text-white/80">Sign in to track orders, save addresses and earn rewards.</p>
        </div>
        <p className="text-xs text-white/60">© Crunchy Inn 2026</p>
      </div>

      <div className="flex flex-col justify-center px-6 py-12 md:px-16">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 md:hidden"><Logo /></div>
          <h1 className="text-3xl font-bold">Sign in</h1>
          <p className="mt-1 text-sm text-muted-foreground">Welcome back, hungry friend.</p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">Email</span>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-muted-foreground">Name (optional)</span>
              <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Jane Doe" className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm focus:border-primary focus:outline-none" />
            </label>
            <button type="submit" className="w-full rounded-full bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-glow transition-smooth hover:-translate-y-0.5">
              Continue
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            By signing in you agree to our Terms & Privacy.
          </p>
        </div>
      </div>
    </div>
  );
}