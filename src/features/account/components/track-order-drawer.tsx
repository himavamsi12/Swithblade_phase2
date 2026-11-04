"use client";

import { Check, X } from "lucide-react";
import Image from "next/image";
import { forwardRef } from "react";
import { siteConfig } from "@/config/site";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { OrderView } from "../customer";
import { trackingSteps, type TrackingStep } from "../tracking";
import { focusRing } from "./styles";

const MAX_THUMBNAILS = 3;

/** "1 Aug 2025, 10:32 AM", in the shopper's time zone. */
const dateTime = (iso: string) =>
  new Date(iso)
    .toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    })
    .replace(/\b(am|pm)\b/i, (m) => m.toUpperCase());

/**
 * Track order panel: slides in from the right over the order history, with
 * the order's items and its shipment progress. A native modal <dialog>, so
 * Escape, focus and the backdrop come from the browser.
 */
export const TrackOrderDrawer = forwardRef<
  HTMLDialogElement,
  { order: OrderView; open: boolean; onClose: () => void }
>(function TrackOrderDrawer({ order, open, onClose }, ref) {
  const steps = trackingSteps(order.status, order.tracking);
  const count = order.items.reduce((sum, i) => sum + i.quantity, 0);
  const { carrier, trackingNumber } = order.tracking;

  return (
    <dialog
      ref={ref}
      aria-labelledby={`track-${order.id}`}
      onClose={onClose}
      // Clicks on the backdrop land on the dialog itself.
      onClick={(e) => {
        if (e.target === e.currentTarget) e.currentTarget.close();
      }}
      className="m-0 ml-auto h-dvh max-h-none w-full max-w-[452px] translate-x-0 overflow-y-auto bg-white p-0 text-black transition-transform duration-300 outline-none backdrop:bg-black/30 motion-reduce:transition-none starting:translate-x-full"
    >
      {open && (
        <div className="flex min-h-full flex-col">
          <header className="flex items-start justify-between gap-4 border-b border-stroke px-8 pt-9 pb-6">
            <div>
              <h2
                id={`track-${order.id}`}
                className="text-h4 font-bold uppercase"
              >
                Track order
              </h2>
              <p className="mt-1 text-body-3 text-muted">{order.number}</p>
            </div>
            <button
              type="button"
              autoFocus
              onClick={(e) => e.currentTarget.closest("dialog")?.close()}
              aria-label="Close"
              className={cn(
                "p-1 transition-opacity hover:opacity-70",
                focusRing,
              )}
            >
              <X size={22} strokeWidth={1.5} aria-hidden />
            </button>
          </header>

          <section className="flex items-center gap-3 border-b border-stroke px-8 py-5">
            {order.items.slice(0, MAX_THUMBNAILS).map((item) => (
              <div
                key={item.key}
                className="relative h-[70px] w-14 shrink-0 overflow-hidden bg-card"
              >
                {item.image && (
                  <Image
                    src={item.image}
                    alt=""
                    fill
                    sizes="56px"
                    className="object-cover"
                  />
                )}
              </div>
            ))}
            <div className="ml-2 flex flex-col gap-1">
              <p className="text-body-2 font-semibold uppercase">
                {count} {count === 1 ? "item" : "items"}
              </p>
              {order.total != null && order.currency && (
                <p className="text-body-3 text-muted">
                  Order total: {formatPrice(order.total, order.currency)}
                </p>
              )}
            </div>
          </section>

          <section className="flex-1 px-8 py-8">
            <h3 className="text-body-4 tracking-[0.04em] text-muted uppercase">
              Shipment progress
            </h3>
            <ol className="mt-6">
              {steps.map((step, i) => (
                <Step
                  key={step.key}
                  step={step}
                  last={i === steps.length - 1}
                  cancelled={step.key === "cancelled"}
                />
              ))}
            </ol>
            {(carrier || trackingNumber || order.trackingUrl) && (
              <div className="mt-4 border-t border-stroke pt-5 text-body-3">
                {(carrier || trackingNumber) && (
                  <p className="text-muted">
                    {[carrier, trackingNumber && `AWB ${trackingNumber}`]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
                {order.trackingUrl && (
                  <a
                    href={order.trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "mt-2 inline-block font-semibold uppercase underline underline-offset-2",
                      focusRing,
                    )}
                  >
                    Track with courier
                  </a>
                )}
              </div>
            )}
          </section>

          <footer className="border-t border-stroke px-8 py-5 text-center text-body-3 text-muted">
            For help, contact{" "}
            <a
              href={`mailto:${siteConfig.supportEmail}`}
              className={cn("text-black hover:underline", focusRing)}
            >
              {siteConfig.supportEmail}
            </a>
          </footer>
        </div>
      )}
    </dialog>
  );
});

function Step({
  step,
  last,
  cancelled,
}: {
  step: TrackingStep;
  last: boolean;
  cancelled: boolean;
}) {
  const reached = step.state !== "upcoming";
  return (
    <li className="relative flex gap-5 pb-8 last:pb-0">
      {!last && (
        <span
          aria-hidden
          className={cn(
            "absolute top-6 bottom-0 left-[11px] w-px",
            step.state === "done" ? "bg-primary" : "bg-stroke",
          )}
        />
      )}
      <span
        aria-hidden
        className={cn(
          "relative flex size-6 shrink-0 items-center justify-center rounded-full",
          step.state === "done" && "bg-primary text-white",
          step.state === "current" &&
            (cancelled ? "border-2 border-red-600" : "border-2 border-primary"),
          step.state === "upcoming" && "border border-stroke bg-white",
        )}
      >
        {step.state === "done" && <Check size={14} strokeWidth={2.5} />}
        {step.state === "current" && (
          <span
            className={cn(
              "size-2.5 rounded-full",
              cancelled ? "bg-red-600" : "bg-primary",
            )}
          />
        )}
      </span>
      <div className="-mt-0.5 flex flex-col gap-1.5">
        <p
          className={cn(
            "text-body-2 font-semibold uppercase",
            !reached && "text-muted",
            cancelled && "text-red-600",
          )}
        >
          {step.label}
          <span className="sr-only">
            {step.state === "done"
              ? " (done)"
              : step.state === "current"
                ? " (current)"
                : " (not yet)"}
          </span>
        </p>
        {step.at && (
          <p className="text-body-3 text-muted">{dateTime(step.at)}</p>
        )}
      </div>
    </li>
  );
}
