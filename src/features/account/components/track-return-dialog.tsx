"use client";

import { Check, X } from "lucide-react";
import { forwardRef } from "react";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { OrderView, ReturnView } from "../customer";
import {
  returnStatusLabel,
  returnSteps,
  type ReturnStep,
} from "../return-request";
import { AccountModal } from "./account-modal";
import { Thumb } from "./return-order-dialog";
import { focusRing } from "./styles";

const badge: Record<ReturnView["status"], string> = {
  requested: "bg-[#eef1fb] text-primary",
  approved: "bg-[#eef1fb] text-primary",
  received: "bg-[#eef1fb] text-primary",
  partially_received: "bg-[#eef1fb] text-primary",
  refunded: "bg-[#ecf7ef] text-[#1e7a3c]",
  rejected: "bg-[#fdeeee] text-red-600",
  canceled: "bg-card text-dark-grey",
};

/** "Today", or "4 Nov 2026". */
const when = (iso: string) => {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString()
    ? "Today"
    : d.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
};

/** Track return: each return on the order with its progress, newest first. */
export const TrackReturnDialog = forwardRef<
  HTMLDialogElement,
  { order: OrderView; open: boolean; onClose: () => void }
>(function TrackReturnDialog({ order, open, onClose }, ref) {
  const [latest] = order.returns;
  return (
    <AccountModal
      ref={ref}
      id={`track-return-${order.id}`}
      title="Return history"
      subtitle={
        order.returns.length === 1 && latest
          ? `${latest.number} · ${order.number}`
          : order.number
      }
      open={open}
      onClose={onClose}
    >
      {order.returns.map((r) => (
        <ReturnSection
          key={r.id}
          ret={r}
          currency={order.currency}
          showNumber={order.returns.length > 1}
        />
      ))}
      <footer className="border-t border-stroke px-6 py-5 sm:px-7">
        <button
          type="button"
          onClick={(e) => e.currentTarget.closest("dialog")?.close()}
          className={cn(
            "h-11 w-full bg-black text-body-4 font-semibold tracking-[0.04em] text-white uppercase transition-opacity hover:opacity-85",
            focusRing,
          )}
        >
          Close
        </button>
      </footer>
    </AccountModal>
  );
});

function ReturnSection({
  ret,
  currency,
  showNumber,
}: {
  ret: ReturnView;
  currency: string | null;
  showNumber: boolean;
}) {
  const steps = returnSteps(ret);
  return (
    <div className="border-b border-stroke last:border-b-0">
      <section className="border-b border-stroke px-6 py-5 sm:px-7">
        <div className="mb-3 flex items-center justify-between gap-4">
          <h3 className="text-body-4 tracking-[0.04em] text-muted uppercase">
            {showNumber
              ? `${ret.number} · Products`
              : "Products in this return"}
          </h3>
          <span
            className={cn(
              "px-2 py-1 text-[10px] font-semibold tracking-[0.04em] uppercase",
              badge[ret.status],
            )}
          >
            {returnStatusLabel[ret.status]}
          </span>
        </div>
        <ul className="flex flex-col gap-px bg-stroke">
          {ret.items.map((item) => (
            <li
              key={item.key}
              className="flex items-center gap-4 bg-card px-4 py-3"
            >
              <Thumb src={item.image} />
              <div className="min-w-0">
                <p className="text-body-3 font-semibold uppercase">
                  {item.title}
                </p>
                <p className="text-body-4 text-muted">
                  {[
                    item.options,
                    item.unitPrice != null && currency
                      ? formatPrice(item.unitPrice, currency)
                      : null,
                    item.quantity > 1 ? `Qty ${item.quantity}` : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>
      <section className="px-6 py-6 sm:px-7">
        <h3 className="text-body-4 tracking-[0.04em] text-muted uppercase">
          Return progress
        </h3>
        <ol className="mt-5">
          {steps.map((step, i) => (
            <Step key={step.key} step={step} last={i === steps.length - 1} />
          ))}
        </ol>
      </section>
    </div>
  );
}

function Step({ step, last }: { step: ReturnStep; last: boolean }) {
  const failed = step.state === "failed";
  return (
    <li className="relative flex gap-4 pb-6 last:pb-0">
      {!last && (
        <span
          aria-hidden
          className={cn(
            "absolute top-5 bottom-0 left-[9px] w-px",
            step.state === "done" ? "bg-primary" : "bg-stroke",
          )}
        />
      )}
      <span
        aria-hidden
        className={cn(
          "relative flex size-5 shrink-0 items-center justify-center rounded-full",
          step.state === "done" && "bg-primary text-white",
          step.state === "current" && "border-2 border-primary bg-white",
          step.state === "upcoming" && "border border-stroke bg-white",
          failed && "bg-red-600 text-white",
        )}
      >
        {step.state === "done" && <Check size={12} strokeWidth={3} />}
        {step.state === "current" && (
          <span className="size-2 rounded-full bg-primary" />
        )}
        {failed && <X size={12} strokeWidth={3} />}
      </span>
      <div className="-mt-0.5 flex flex-col gap-1">
        <p
          className={cn(
            "flex items-center gap-2 text-body-3 font-semibold uppercase",
            step.state === "upcoming" && "text-muted",
            failed && "text-red-600",
          )}
        >
          {step.label}
          {step.state === "current" && (
            <span className="text-[9px] tracking-[0.06em] text-primary">
              Current
            </span>
          )}
          <span className="sr-only">
            {step.state === "done"
              ? " (done)"
              : step.state === "current"
                ? " (current)"
                : step.state === "failed"
                  ? ""
                  : " (not yet)"}
          </span>
        </p>
        <p
          className={cn(
            "text-body-4",
            step.state === "upcoming" ? "text-muted/70" : "text-dark-grey",
          )}
        >
          {step.detail}
        </p>
        {step.at && <p className="text-body-4 text-muted">{when(step.at)}</p>}
      </div>
    </li>
  );
}
