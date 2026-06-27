import { Flame } from "lucide-react";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 font-bold ${className}`}>
      <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-hero text-white shadow-glow">
        <Flame className="h-5 w-5" strokeWidth={2.5} />
      </span>
      <span className="text-xl tracking-tight">
        Crunchy<span className="text-primary">Inn</span>
      </span>
    </div>
  );
}