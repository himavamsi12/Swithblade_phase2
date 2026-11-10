"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Minus, Plus, Trash2, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChargeNote } from "@/features/currency/components/charge-note";
import { Price } from "@/features/currency/components/price";
import { cn } from "@/lib/utils";
import { MAX_QUANTITY, subtotals } from "../cart";
import {
  cartActions,
  lineKey,
  OPEN_CART_EVENT,
  syncBag,
  useCart,
} from "../store";
import type { CartLine } from "../types";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current";

type CartDrawerProps = {
  /** The header's bag icon. */
  icon: React.ReactNode;
  className?: string;
};

/**
 * The header's bag button and the full-height cart drawer it opens on the
 * right, over a dark overlay. Adding to the bag anywhere opens it too (see
 * `openCart`). On the cart page itself the button is just a link there.
 *
 * The drawer stays mounted (in a portal, above everything) so it can slide
 * both ways; it's `inert` and `invisible` while closed.
 */
export function CartDrawer({ icon, className }: CartDrawerProps) {
  const [open, setOpen] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const panelId = useId();
  const headingId = useId();
  const { lines, count, ready } = useCart();
  const onCartPage = usePathname() === "/cart";

  const close = () => setOpen(false);

  // Opened from elsewhere, e.g. right after adding to the bag.
  useEffect(() => {
    if (onCartPage) return;
    const onOpen = () => {
      setOpen(true);
      void syncBag();
    };
    window.addEventListener(OPEN_CART_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_CART_EVENT, onOpen);
  }, [onCartPage]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() =>
      heading.current?.focus({ preventScroll: true }),
    );
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const totals = subtotals(lines);

  if (onCartPage) {
    return (
      <Link href="/cart" aria-label="Cart" className={className}>
        {icon}
      </Link>
    );
  }

  const drawer = (
    <>
      <div
        aria-hidden
        onClick={close}
        className={cn(
          "fixed inset-0 z-[90] bg-black/50 transition-[opacity,visibility] duration-300 motion-reduce:transition-none",
          open ? "visible opacity-100" : "invisible opacity-0",
        )}
      />
      <div
        id={panelId}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        data-cart-open={open || undefined}
        inert={!open}
        // Following a link inside the drawer closes it.
        onClick={(e) => {
          if ((e.target as Element).closest("a")) close();
        }}
        className={cn(
          "fixed inset-y-0 right-0 z-[91] flex w-full flex-col bg-white text-black motion-reduce:transition-none md:w-[400px]",
          open
            ? "visible translate-x-0 transition-[translate] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
            : "invisible translate-x-full transition-[translate,visibility] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]",
        )}
      >
        <div className="flex items-center justify-between gap-4 px-4 pt-5 md:px-6">
          <h2
            id={headingId}
            ref={heading}
            tabIndex={-1}
            className="text-[22px] leading-tight font-semibold uppercase outline-none"
          >
            Cart{count > 0 ? ` (${count})` : ""}
          </h2>
          <button
            type="button"
            onClick={() => {
              close();
              button.current?.focus();
            }}
            aria-label="Close cart"
            className={cn(
              "flex size-8 shrink-0 items-center justify-center transition-opacity hover:opacity-60",
              focusRing,
            )}
          >
            <X size={20} strokeWidth={1.5} aria-hidden />
          </button>
        </div>

        {lines.length === 0 ? (
          <p className="mt-6 px-4 text-center text-body-3 md:px-6">
            Your cart is empty.
          </p>
        ) : (
          <>
            <ul
              aria-label="Items in your cart"
              className="mt-4 min-h-0 flex-1 overflow-y-auto px-4 md:px-6"
            >
              {lines.map((line) => (
                <DrawerLine key={lineKey(line)} line={line} />
              ))}
            </ul>

            <div className="border-t border-stroke px-4 py-5 md:px-6">
              <dl className="flex flex-col gap-2">
                {totals.map(({ currency, amount }) => (
                  <div
                    key={currency}
                    className="flex items-center justify-between text-body-3 font-semibold"
                  >
                    <dt className="uppercase">
                      Subtotal{totals.length > 1 ? ` (${currency})` : ""}
                    </dt>
                    <dd>
                      <Price amount={amount} currency={currency} />
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-1 text-body-4 text-muted">
                Shipping calculated at checkout.
              </p>
              {totals.map(({ currency }) => (
                <ChargeNote
                  key={currency}
                  currency={currency}
                  className="mt-1 text-body-4 text-muted"
                />
              ))}
              <Link
                href="/cart"
                className={cn(
                  "mt-4 flex h-12 w-full items-center justify-center bg-primary text-body-2 text-white transition-opacity hover:opacity-90",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                )}
              >
                View bag &amp; checkout
              </Link>
            </div>
          </>
        )}
      </div>
    </>
  );

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-label="Cart"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => {
          setOpen(true);
          // Show what was added on the shopper's other devices.
          void syncBag();
        }}
        className={className}
      >
        {icon}
      </button>
      {ready && createPortal(drawer, document.body)}
    </>
  );
}

function DrawerLine({ line }: { line: CartLine }) {
  const key = lineKey(line);
  const href = `/products/${line.slug}` as const;
  const options = [line.color, line.size].filter(Boolean).join(" | ");

  return (
    <li className="flex gap-4 border-b border-stroke py-4 last:border-b-0">
      <Link
        href={href}
        className={cn(
          "relative h-[100px] w-20 shrink-0 overflow-hidden bg-cream",
          focusRing,
        )}
      >
        {line.image && (
          <Image
            src={line.image}
            alt={line.name}
            fill
            sizes="80px"
            className="object-cover"
          />
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <Link
            href={href}
            className={cn(
              "text-body-3 font-semibold uppercase hover:underline",
              focusRing,
            )}
          >
            {line.name}
          </Link>
          <p className="shrink-0 text-body-3">
            <Price
              amount={line.price * line.quantity}
              currency={line.currency}
            />
          </p>
        </div>
        {options && <p className="mt-1 text-body-4 text-muted">{options}</p>}

        <div className="mt-auto flex items-center justify-between gap-4 pt-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => cartActions.setQuantity(key, line.quantity - 1)}
              disabled={line.quantity <= 1}
              aria-label={`Decrease quantity of ${line.name}`}
              className={cn("disabled:text-stroke", focusRing)}
            >
              <Minus size={12} aria-hidden />
            </button>
            <span
              className="min-w-4 text-center text-body-3 tabular-nums"
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
              <Plus size={12} aria-hidden />
            </button>
          </div>
          <button
            type="button"
            onClick={() => cartActions.remove(key)}
            aria-label={`Remove ${line.name} from cart`}
            className={cn(
              "flex size-8 items-center justify-center text-dark-grey transition-colors hover:text-red-600",
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
