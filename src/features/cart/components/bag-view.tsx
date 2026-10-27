"use client";

import { ArrowRight, Minus, Plus, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import applePay from "@/assets/icons/payments/applepay.svg";
import googlePay from "@/assets/icons/payments/googlepay.svg";
import mastercard from "@/assets/icons/payments/mastercard.svg";
import visa from "@/assets/icons/payments/visa.svg";
import { siteConfig } from "@/config/site";
import { CheckoutButton } from "@/features/checkout/components/checkout-button";
import { ChargeNote } from "@/features/currency/components/charge-note";
import { Price } from "@/features/currency/components/price";
import { cn } from "@/lib/utils";
import { MAX_QUANTITY, subtotals } from "../cart";
import { cartActions, lineKey, useCart } from "../store";
import type { CartLine } from "../types";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const cardTitle = "text-body-3 font-semibold tracking-[0.04em] uppercase";

const paymentMarks = [
  { src: applePay, label: "Apple Pay", className: "h-[22px] w-[47px]" },
  { src: googlePay, label: "Google Pay", className: "h-[21px] w-[52px]" },
  { src: mastercard, label: "Mastercard", className: "h-6 w-9" },
  { src: visa, label: "Visa", className: "h-9 w-12" },
];

/** Bag heading, line items and the order summary. */
export function BagView() {
  const { lines, count, ready } = useCart();
  const [paid, setPaid] = useState(false);

  return (
    <>
      <h1 className="text-h4 font-semibold uppercase md:text-h3">
        Bag{" "}
        <span className="font-normal" aria-label={`${count} items`}>
          [{ready ? count : "…"}]
        </span>
      </h1>
      <div className="mt-4 border-t border-stroke" />

      {!ready ? (
        <BagSkeleton />
      ) : lines.length === 0 ? (
        <div className="flex flex-col items-start gap-4 py-16">
          <p className="text-body-1" role={paid ? "status" : undefined}>
            {paid
              ? "Payment received. Thank you for your order!"
              : "Your bag is empty."}
          </p>
          <Link
            href="/products"
            className={cn(
              "inline-flex h-12 items-center bg-primary px-8 text-body-2 text-white transition-opacity hover:opacity-90",
              focusRing,
            )}
          >
            Continue shopping
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,736px)_412px] lg:justify-between">
          <ul aria-label="Items in your bag">
            {lines.map((line) => (
              <BagLine key={lineKey(line)} line={line} />
            ))}
          </ul>
          <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
            <OrderSummary lines={lines} onPaid={() => setPaid(true)} />
            <AccountCard />
          </aside>
        </div>
      )}
    </>
  );
}

function BagLine({ line }: { line: CartLine }) {
  const key = lineKey(line);
  const href = `/products/${line.slug}` as const;
  const options = [line.color, line.size].filter(Boolean).join(" | ");

  return (
    <li className="flex gap-4 border-b border-stroke py-8 first:pt-0 md:gap-7">
      <Link
        href={href}
        className={cn(
          "relative h-[170px] w-[136px] shrink-0 overflow-hidden bg-cream",
          focusRing,
        )}
      >
        {line.image && (
          <Image
            src={line.image}
            alt={line.name}
            fill
            sizes="136px"
            className="object-cover"
          />
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <Link
          href={href}
          className={cn(
            "text-body-2 font-semibold uppercase hover:underline",
            focusRing,
          )}
        >
          {line.name}
        </Link>
        {options && <p className="mt-2 text-body-3 text-muted">{options}</p>}
        <p className="mt-2 text-body-2">
          <Price amount={line.price} currency={line.currency} />
        </p>

        <div className="mt-auto flex items-center justify-between gap-4 pt-6">
          <div className="flex items-center gap-3">
            <span className="text-body-4 tracking-[0.06em] text-muted uppercase">
              Quantity:
            </span>
            <button
              type="button"
              onClick={() => cartActions.setQuantity(key, line.quantity - 1)}
              disabled={line.quantity <= 1}
              aria-label={`Decrease quantity of ${line.name}`}
              className={cn("disabled:text-stroke", focusRing)}
            >
              <Minus size={14} aria-hidden />
            </button>
            <span
              className="min-w-4 text-center text-body-2 tabular-nums"
              aria-live="polite"
              aria-label={`Quantity ${line.quantity}`}
            >
              {line.quantity}
            </span>
            <button
              type="button"
              onClick={() => cartActions.setQuantity(key, line.quantity + 1)}
              disabled={line.quantity >= MAX_QUANTITY}
              aria-label={`Increase quantity of ${line.name}`}
              className={cn("disabled:text-stroke", focusRing)}
            >
              <Plus size={14} aria-hidden />
            </button>
          </div>
          <button
            type="button"
            onClick={() => cartActions.remove(key)}
            aria-label={`Remove ${line.name} from bag`}
            className={cn(
              "text-red-600 transition-opacity hover:opacity-70",
              focusRing,
            )}
          >
            <Trash2 size={16} strokeWidth={1.5} aria-hidden />
          </button>
        </div>
      </div>
    </li>
  );
}

function OrderSummary({
  lines,
  onPaid,
}: {
  lines: CartLine[];
  onPaid: () => void;
}) {
  const totals = subtotals(lines);
  const row = "flex items-center justify-between text-body-3";

  return (
    <section
      aria-labelledby="order-summary"
      className="border border-stroke px-4 py-6 md:px-4"
    >
      <h2 id="order-summary" className={cardTitle}>
        Order summary
      </h2>
      <dl className="mt-6 flex flex-col gap-4">
        {totals.map(({ currency, amount }) => (
          <div key={currency} className={row}>
            <dt className="text-muted">
              Subtotal{totals.length > 1 ? ` (${currency})` : ""}
            </dt>
            <dd>
              <Price amount={amount} currency={currency} />
            </dd>
          </div>
        ))}
        <div className={row}>
          <dt className="text-muted">Shipping</dt>
          <dd>Free</dd>
        </div>
      </dl>
      <dl className="mt-4 flex flex-col gap-2 border-t border-stroke pt-4">
        {totals.map(({ currency, amount }) => (
          <div key={currency} className={cn(row, "font-semibold")}>
            <dt className="uppercase">
              Total{totals.length > 1 ? ` (${currency})` : ""}
            </dt>
            <dd>
              <Price amount={amount} currency={currency} />
            </dd>
          </div>
        ))}
      </dl>
      {totals.map(({ currency }) => (
        <ChargeNote
          key={currency}
          currency={currency}
          className="mt-2 text-body-4 text-muted"
        />
      ))}
      <CheckoutButton
        lines={lines}
        onPaid={onPaid}
        className={cn(
          "mt-4 h-12 w-full bg-primary text-body-2 text-white transition-opacity hover:opacity-90 disabled:opacity-60",
          focusRing,
        )}
      />
      <div className="mt-4 border-t border-stroke pt-4">
        <p className="text-body-4 tracking-[0.04em] text-muted uppercase">
          We accept following payment…
        </p>
        <ul className="mt-3 flex items-center gap-4">
          {paymentMarks.map((m) => (
            <li key={m.label}>
              <Image
                src={m.src}
                alt={m.label}
                className={cn("object-contain", m.className)}
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function AccountCard() {
  return (
    <section
      aria-labelledby="bag-account"
      className="border border-stroke px-4 py-6"
    >
      <h2 id="bag-account" className={cardTitle}>
        Continue as Switchblade user
      </h2>
      <p className="mt-4 text-body-3 text-muted">
        Log in or create an account to enjoy a personalised shopping experience
        and speed up future purchases.
      </p>
      <Link
        href={siteConfig.accountHref}
        className={cn(
          "mt-4 inline-flex items-center gap-2 text-body-3 uppercase underline underline-offset-2",
          focusRing,
        )}
      >
        Login or signup
        <ArrowRight size={14} aria-hidden />
      </Link>
    </section>
  );
}

function BagSkeleton() {
  return (
    <div className="mt-8 flex flex-col gap-8" aria-hidden>
      {[0, 1].map((i) => (
        <div key={i} className="flex gap-7 lg:w-[736px]">
          <div className="h-[170px] w-[136px] animate-pulse bg-card" />
          <div className="flex flex-1 flex-col gap-3 pt-1">
            <div className="h-3 w-40 animate-pulse bg-card" />
            <div className="h-3 w-24 animate-pulse bg-card" />
          </div>
        </div>
      ))}
    </div>
  );
}
