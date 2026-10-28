"use client";

import { ArrowRight, Check, Minus, Plus, Trash2, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import applePay from "@/assets/icons/payments/applepay.svg";
import googlePay from "@/assets/icons/payments/googlepay.svg";
import mastercard from "@/assets/icons/payments/mastercard.svg";
import visa from "@/assets/icons/payments/visa.svg";
import { EmptyState } from "@/components/ui/empty-state";
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
export function BagView({ accountEmail }: { accountEmail: string | null }) {
  const { lines, count, ready } = useCart();
  const [paidOrder, setPaidOrder] = useState<string | null>(null);

  const [failed, setFailed] = useState(false);

  if (paidOrder) return <OrderPlaced orderNumber={paidOrder} />;
  if (failed) return <PaymentFailed onRetry={() => setFailed(false)} />;

  return (
    <>
      <h1 className="text-h4 font-semibold uppercase md:text-h3">
        Your bag{" "}
        <span className="font-normal" aria-label={`${count} items`}>
          [{ready ? count : "…"}]
        </span>
      </h1>
      <div className="mt-4 border-t border-stroke" />

      {!ready ? (
        <BagSkeleton />
      ) : lines.length === 0 ? (
        <EmptyState
          message="Your shopping bag is empty"
          action="Continue Shopping"
          className="pt-16 md:pt-40"
        />
      ) : (
        <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,736px)_412px] lg:justify-between">
          <ul aria-label="Items in your bag">
            {lines.map((line) => (
              <BagLine key={lineKey(line)} line={line} />
            ))}
          </ul>
          <aside className="flex flex-col gap-4 lg:sticky lg:top-6 lg:self-start">
            <OrderSummary
              lines={lines}
              accountEmail={accountEmail}
              onPaid={setPaidOrder}
              onFailed={() => setFailed(true)}
            />
            <AccountCard />
          </aside>
        </div>
      )}
    </>
  );
}

/** Shown in place of the bag once the payment is verified. */
function OrderPlaced({ orderNumber }: { orderNumber: string }) {
  return (
    <div
      role="status"
      className="mx-auto flex max-w-[424px] flex-col items-center py-12 text-center md:py-16"
    >
      <span className="flex size-[52px] items-center justify-center rounded-full bg-green-600 text-white">
        <Check aria-hidden className="size-8" strokeWidth={2.5} />
      </span>
      <h1 className="mt-6 text-h4 md:text-h3">Thank you for shopping!</h1>
      <p className="mt-2 text-body-1 text-muted">
        Your order has been received and is being processed.
      </p>
      <div className="mt-12 w-full border border-stroke px-6 py-8">
        <p className="text-body-2 text-muted">Order Reference</p>
        <p className="mt-1 text-h5 select-all">#{orderNumber}</p>
        <p className="mt-6 text-body-3 text-muted">
          Please save this for future reference
        </p>
      </div>
      <Link
        href="/"
        className={cn(
          "mt-4 flex h-10 w-full items-center justify-center bg-primary text-body-3 text-white transition-opacity hover:opacity-90",
          focusRing,
        )}
      >
        Return to Home
      </Link>
    </div>
  );
}

/** Shown in place of the bag when the shopper closes Razorpay after a failure. */
function PaymentFailed({ onRetry }: { onRetry: () => void }) {
  return (
    <div
      role="alert"
      className="mx-auto flex max-w-[456px] flex-col items-center py-12 text-center md:py-16"
    >
      <span className="flex size-[52px] items-center justify-center rounded-full bg-red-600 text-white">
        <X aria-hidden className="size-8" strokeWidth={2.5} />
      </span>
      <h1 className="mt-6 text-h4 md:text-h3">Payment Failed!</h1>
      <p className="mt-2 text-body-1 text-muted">
        Please retry checking out. If the amount has been debited, it will be
        refunded within 5–7 business days.
      </p>
      <button
        type="button"
        onClick={onRetry}
        className={cn(
          "mt-12 flex h-10 w-full items-center justify-center bg-primary text-body-3 text-white transition-opacity hover:opacity-90",
          focusRing,
        )}
      >
        Retry Checkout
      </button>
      <div className="mt-4 w-full border border-stroke px-6 py-8">
        <p className="text-body-2 text-muted">Need Help?</p>
        <p className="mt-1 text-h5">Contact Support</p>
        <p className="mt-6 text-body-3 text-muted">
          Our team is available 24/7 to assist you,
          <br />
          reach us{" "}
          <a
            href={`mailto:${siteConfig.supportEmail}`}
            className={cn("text-primary underline", focusRing)}
          >
            {siteConfig.supportEmail}
          </a>
        </p>
      </div>
    </div>
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
  accountEmail,
  onPaid,
  onFailed,
}: {
  lines: CartLine[];
  accountEmail: string | null;
  onPaid: (orderNumber: string) => void;
  onFailed: () => void;
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
        accountEmail={accountEmail}
        onPaid={onPaid}
        onFailed={onFailed}
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
