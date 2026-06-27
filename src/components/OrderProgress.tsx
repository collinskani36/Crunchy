import {
  Check,
  ChefHat,
  CookingPot,
  MapPin,
  PackageCheck,
  Truck,
  XCircle,
  Clock,
} from "lucide-react";
import { STATUS_FLOW, STATUS_LABEL, type OrderStatus } from "@/lib/store";

const ICONS: Record<OrderStatus, React.ElementType> = {
  pending: Clock,
  confirmed: PackageCheck,
  preparing: CookingPot,
  ready: ChefHat,
  out_for_delivery: Truck,
  delivered: MapPin,
  cancelled: XCircle,
};

const STEP_SUBLABEL: Record<OrderStatus, string> = {
  pending: "We've received your order",
  confirmed: "Your order has been accepted",
  preparing: "Kitchen is working on it",
  ready: "Packed and waiting for rider",
  out_for_delivery: "Rider is heading to you",
  delivered: "Enjoy your meal!",
  cancelled: "This order was cancelled",
};

export function OrderProgress({ status }: { status: OrderStatus }) {
  // For cancelled orders, show a standalone cancelled card — no step list
  if (status === "cancelled") {
    return (
      <div className="rounded-3xl bg-card p-5 shadow-soft">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-destructive/10 text-destructive">
            <XCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="font-bold text-destructive">Order Cancelled</p>
            <p className="text-xs text-muted-foreground">
              Please contact us if you have questions.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // currentIdx is the index of the current status in STATUS_FLOW.
  // STATUS_FLOW only contains the 6 active statuses (no cancelled).
  // If somehow status isn't in the flow, default to 0 so at least
  // the first step shows as active — never a blank render.
  const currentIdx = Math.max(0, STATUS_FLOW.indexOf(status));
  const isDelivered = status === "delivered";
  const progressPct = (currentIdx / (STATUS_FLOW.length - 1)) * 100;

  return (
    <div className="rounded-3xl bg-card p-5 shadow-soft">
      {/* Header row */}
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Order status
          </p>
          <p className="text-xl font-bold">{STATUS_LABEL[status]}</p>
        </div>
        {!isDelivered && (
          <div className="flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1.5 text-xs font-semibold text-primary">
            <span className="h-2 w-2 animate-pulse rounded-full bg-primary" />
            Live
          </div>
        )}
        {isDelivered && (
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600">
            <Check className="h-3 w-3" />
            Done
          </div>
        )}
      </div>

      {/* Progress bar */}
      <div className="mb-6 h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={`h-full rounded-full transition-all duration-700 ${
            isDelivered ? "bg-emerald-500" : "bg-primary"
          }`}
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Steps */}
      <ul className="space-y-4">
        {STATUS_FLOW.map((s, idx) => {
          const done = idx < currentIdx;
          const active = idx === currentIdx;
          const upcoming = idx > currentIdx;
          const Icon = ICONS[s];

          return (
            <li key={s} className="flex items-start gap-3">
              {/* Icon circle */}
              <div
                className={`relative mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full transition-all duration-300 ${
                  done
                    ? "bg-emerald-500 text-white"
                    : active
                    ? isDelivered
                      ? "bg-emerald-500 text-white"
                      : "bg-primary text-primary-foreground shadow-glow"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {/* Ping ring on active step */}
                {active && !isDelivered && (
                  <span className="absolute -inset-1 animate-ping rounded-full border-2 border-primary opacity-30" />
                )}
              </div>

              {/* Text */}
              <div className="flex-1 pt-0.5">
                <p
                  className={`text-sm font-semibold ${
                    upcoming ? "text-muted-foreground" : ""
                  }`}
                >
                  {STATUS_LABEL[s]}
                  {active && !isDelivered && (
                    <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />
                      Now
                    </span>
                  )}
                </p>
                <p className="text-xs text-muted-foreground">
                  {STEP_SUBLABEL[s]}
                </p>
              </div>

              {/* Tick for completed steps */}
              {done && (
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}