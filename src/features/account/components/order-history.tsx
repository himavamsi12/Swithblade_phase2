"use client";

import { ChevronDown } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useId, useState } from "react";
import { Collapse } from "@/components/ui/disclosure";
import { formatPrice } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { OrderStatusKey, OrderView } from "../customer";
import { focusRing } from "./styles";

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

const date = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

const money = (amount: number | null, currency: string | null) =>
  amount != null && currency ? formatPrice(amount, currency) : "—";

/** One collapsible card per order; the newest starts open. */
export function OrderHistory({ orders }: { orders: OrderView[] }) {
  return (
    <ul className="flex flex-col gap-4">
      {orders.map((order, i) => (
        <li key={order.id}>
          <OrderCard order={order} defaultOpen={i === 0} />
        </li>
      ))}
    </ul>
  );
}

function OrderCard({
  order,
  defaultOpen,
}: {
  order: OrderView;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  const status = statusStyles[order.status];

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
      aria-label={`Order ${order.number}`}
      className="border border-stroke"
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
        <span
          className={cn(
            "shrink-0 px-2.5 py-1 text-body-4 font-semibold tracking-[0.04em] uppercase",
            status.className,
          )}
        >
          {status.label}
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
        <div className="flex items-center justify-between gap-4 border-t border-stroke bg-[#fafafa] px-5 py-3">
          {order.trackingUrl ? (
            <a
              href={order.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "text-body-4 font-semibold uppercase underline underline-offset-2",
                focusRing,
              )}
            >
              Track order
            </a>
          ) : (
            <span className="text-body-4 text-muted uppercase">
              Tracking available once shipped
            </span>
          )}
          <Link
            href="/account/returns"
            className={cn(
              "text-body-4 text-dark-grey uppercase underline underline-offset-2 hover:text-black",
              focusRing,
            )}
          >
            Return history
          </Link>
        </div>
      </Collapse>
    </article>
  );
}
