"use client";

import { ChevronDown } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { Collapse } from "@/components/ui/disclosure";
import { siteConfig } from "@/config/site";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { OrderStatusKey, OrderView } from "../customer";
import { orderReturnBadge, returnRequestHref } from "../return-request";
import {
  ReturnOrderDialog,
  type ReturnReasonOption,
} from "./return-order-dialog";
import { focusRing } from "./styles";
import { TrackOrderDrawer } from "./track-order-drawer";
import { TrackReturnDialog } from "./track-return-dialog";

const statusStyles: Record<
  OrderStatusKey,
  { label: string; className: string }
> = {
  processing: { label: "Processing", className: "bg-card text-dark-grey" },
  packed: { label: "Packed", className: "bg-[#eef1fb] text-primary" },
  shipped: { label: "Shipped", className: "bg-[#eef1fb] text-primary" },
  delivered: { label: "Delivered", className: "bg-[#ecf7ef] text-[#1e7a3c]" },
  returned: { label: "Returned", className: "bg-card text-dark-grey" },
  cancelled: { label: "Cancelled", className: "bg-[#fdeeee] text-red-600" },
};

const returnBadgeStyles = {
  processing: {
    label: "Return processing",
    className: "bg-[#fff5e6] text-[#9a5b00]",
  },
  refunded: { label: "Refunded", className: "bg-card text-dark-grey" },
};

const date = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const money = (amount: number | null, currency: string | null) =>
  amount != null && currency ? formatPrice(amount, currency) : "—";

/**
 * One collapsible card per order. The newest starts open, or the one named
 * by `openNumber` (e.g. "SB-1010" from an email link), scrolled into view.
 */
export function OrderHistory({
  orders,
  reasons,
  openNumber = null,
}: {
  orders: OrderView[];
  reasons: ReturnReasonOption[];
  openNumber?: string | null;
}) {
  const linked = orders.some((o) => o.number === openNumber);
  return (
    <ul className="flex flex-col gap-4">
      {orders.map((order, i) => (
        <li key={order.id}>
          <OrderCard
            order={order}
            reasons={reasons}
            defaultOpen={linked ? order.number === openNumber : i === 0}
            scrollIntoView={linked && order.number === openNumber}
          />
        </li>
      ))}
    </ul>
  );
}

function OrderCard({
  order,
  reasons,
  defaultOpen,
  scrollIntoView = false,
}: {
  order: OrderView;
  reasons: ReturnReasonOption[];
  defaultOpen: boolean;
  scrollIntoView?: boolean;
}) {
  const card = useRef<HTMLElement>(null);
  useEffect(() => {
    if (scrollIntoView) card.current?.scrollIntoView({ block: "start" });
  }, [scrollIntoView]);
  const [open, setOpen] = useState(defaultOpen);
  const [tracking, setTracking] = useState(false);
  const [returning, setReturning] = useState(false);
  const [trackingReturn, setTrackingReturn] = useState(false);
  const trackDialog = useRef<HTMLDialogElement>(null);
  const returnDialog = useRef<HTMLDialogElement>(null);
  const trackReturnDialog = useRef<HTMLDialogElement>(null);
  // Old orders without item snapshots can't be matched to products.
  const canReturnHere = order.items.some((i) => i.productSlug);
  const itemsLeft = order.items.some((i) => i.returnableQuantity > 0);
  const hasReturns = order.returns.length > 0;
  const panelId = useId();
  const status = statusStyles[order.status];
  const returnKind = orderReturnBadge(order.returns);
  const returnBadge = returnKind ? returnBadgeStyles[returnKind] : null;

  // Collapsed cards show a compact summary; the open card spells out dates.
  const facts: [string, string][] = [
    ["Order ID", order.number],
    [open ? "Ordered date" : "Date", date(order.orderedAt)],
    ...(open && order.expectedDeliveryAt
      ? ([["Expected delivery", date(order.expectedDeliveryAt)]] as [
          string,
          string,
        ][])
      : []),
    ["Total", money(order.total, order.currency)],
  ];

  return (
    <article
      ref={card}
      aria-label={`Order ${order.number}`}
      // Clear of the sticky header when scrolled to from an email link.
      className="scroll-mt-24 border border-stroke"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={panelId}
        className={cn(
          "flex w-full items-center gap-4 px-5 py-4 text-left",
          focusRing,
        )}
      >
        <dl className="grid flex-1 grid-cols-2 gap-x-8 gap-y-3 sm:flex sm:flex-wrap">
          {facts.map(([label, value], i) => (
            <div key={label} className="flex flex-col gap-1">
              <dt className="text-body-4 text-muted uppercase">{label}</dt>
              <dd className={cn("text-body-2", i === 0 && "font-semibold")}>
                {value}
              </dd>
            </div>
          ))}
        </dl>
        <span className="flex shrink-0 flex-col items-end gap-1.5 sm:flex-row sm:items-center">
          {[status, returnBadge].map(
            (badge) =>
              badge && (
                <span
                  key={badge.label}
                  className={cn(
                    "px-2.5 py-1 text-body-4 font-semibold tracking-[0.04em] whitespace-nowrap uppercase",
                    badge.className,
                  )}
                >
                  {badge.label}
                </span>
              ),
          )}
        </span>
        <ChevronDown
          size={16}
          strokeWidth={1.5}
          aria-hidden
          className={cn(
            "shrink-0 transition-transform duration-300",
            open && "rotate-180",
          )}
        />
      </button>

      <Collapse open={open} id={panelId}>
        <ul className="border-t border-stroke">
          {order.items.map((item) => (
            <li
              key={item.key}
              className="flex gap-5 border-b border-stroke px-5 py-4 last:border-b-0"
            >
              <div className="relative h-[77px] w-[62px] shrink-0 overflow-hidden bg-card">
                {item.image && (
                  <Image
                    src={item.image}
                    alt=""
                    fill
                    sizes="62px"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="flex min-w-0 flex-col justify-center gap-1.5">
                {item.productSlug ? (
                  <Link
                    href={`/products/${item.productSlug}`}
                    className={cn(
                      "text-body-2 font-semibold uppercase hover:underline",
                      focusRing,
                    )}
                  >
                    {item.title}
                  </Link>
                ) : (
                  <p className="text-body-2 font-semibold uppercase">
                    {item.title}
                  </p>
                )}
                {(item.options || item.quantity > 1) && (
                  <p className="text-body-3 text-muted">
                    {[
                      item.options,
                      item.quantity > 1 ? `Qty ${item.quantity}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                )}
                {item.unitPrice != null && (
                  <p className="text-body-2">
                    {money(item.unitPrice, order.currency)}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-stroke bg-[#fafafa] px-5 py-3">
          <button
            type="button"
            onClick={() => {
              setTracking(true);
              trackDialog.current?.showModal();
            }}
            className={cn(
              "text-body-4 font-semibold uppercase underline underline-offset-2",
              focusRing,
            )}
          >
            Track order
          </button>
          {hasReturns && (
            <button
              type="button"
              onClick={() => {
                setTrackingReturn(true);
                trackReturnDialog.current?.showModal();
              }}
              className={cn(
                "text-body-4 font-semibold text-[#1e7a3c] uppercase underline underline-offset-2",
                focusRing,
              )}
            >
              Track return
            </button>
          )}
          {order.returnable &&
            (canReturnHere ? (
              itemsLeft && (
                <button
                  type="button"
                  onClick={() => {
                    setReturning(true);
                    returnDialog.current?.showModal();
                  }}
                  className={cn(
                    "text-body-4 font-semibold text-primary uppercase underline underline-offset-2",
                    focusRing,
                  )}
                >
                  {hasReturns ? "Return another item" : "Return order"}
                </button>
              )
            ) : (
              <a
                href={returnRequestHref(siteConfig.supportEmail, order)}
                className={cn(
                  "text-body-4 font-semibold text-primary uppercase underline underline-offset-2",
                  focusRing,
                )}
              >
                Return order
              </a>
            ))}
        </div>
      </Collapse>
      <TrackOrderDrawer
        ref={trackDialog}
        order={order}
        open={tracking}
        onClose={() => setTracking(false)}
      />
      <ReturnOrderDialog
        ref={returnDialog}
        order={order}
        reasons={reasons}
        open={returning}
        onClose={() => setReturning(false)}
      />
      {hasReturns && (
        <TrackReturnDialog
          ref={trackReturnDialog}
          order={order}
          open={trackingReturn}
          onClose={() => setTrackingReturn(false)}
        />
      )}
    </article>
  );
}
