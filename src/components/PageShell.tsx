import type { ReactNode } from "react";
import { Header } from "./Header";
import { MobileNav } from "./MobileNav";

export function PageShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={["min-h-screen bg-background pb-20 md:pb-0", className].filter(Boolean).join(" ")}>
      <Header />
      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">{children}</main>
      <MobileNav />
    </div>
  );
}