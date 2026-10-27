"use client";

import Image from "next/image";
import { ChevronDown, X } from "lucide-react";
import { useEffect, useId, useState } from "react";
import applePay from "@/assets/icons/payments/applepay.svg";
import googlePay from "@/assets/icons/payments/googlepay.svg";
import mastercard from "@/assets/icons/payments/mastercard.svg";
import visa from "@/assets/icons/payments/visa.svg";
import { cn } from "@/lib/utils";
import {
  currencies,
  currencyActions,
  useCurrencyPreference,
  type CurrencyCode,
} from "../store";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

const paymentMarks = [
  { src: applePay, label: "Apple Pay", className: "h-[22px] w-[47px]" },
  { src: googlePay, label: "Google Pay", className: "h-[21px] w-[52px]" },
  { src: mastercard, label: "Mastercard", className: "h-6 w-9" },
  { src: visa, label: "Visa", className: "h-9 w-12" },
];

/**
 * Currency preference card, pinned bottom-right on page load until the
 * shopper picks a currency or closes it. Non-modal: the page stays usable
 * behind it.
 */
export function CurrencyPrompt() {
  const { currency, answered, ready } = useCurrencyPreference();
  const [selected, setSelected] = useState<CurrencyCode>(currency ?? "INR");
  const headingId = useId();
  const selectId = useId();
  const open = ready && !answered;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") currencyActions.dismiss();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (!open) return null;

  return (
    <section
      role="dialog"
      aria-labelledby={headingId}
      className="fixed right-4 bottom-4 z-40 w-[calc(100%-2rem)] max-w-[500px] bg-white p-6 text-black shadow-[0_12px_32px_rgb(0_0_0/0.12)] transition-[opacity,translate] duration-500 ease-out motion-reduce:transition-none md:right-10 md:bottom-10 md:p-8 starting:translate-y-4 starting:opacity-0"
    >
      <button
        type="button"
        aria-label="Close"
        onClick={currencyActions.dismiss}
        className={cn(
          "absolute top-4 right-4 transition-opacity hover:opacity-60",
          focusRing,
        )}
      >
        <X size={20} strokeWidth={1.5} aria-hidden />
      </button>

      <h2
        id={headingId}
        className="mt-6 text-[20px] leading-tight font-semibold md:whitespace-nowrap"
      >
        Please choose your currency preference
      </h2>

      <form
        className="mt-5"
        onSubmit={(e) => {
          e.preventDefault();
          currencyActions.choose(selected);
        }}
      >
        <label htmlFor={selectId} className="text-body-2 text-muted">
          View Currency In
        </label>
        <div className="relative mt-3">
          <select
            id={selectId}
            value={selected}
            onChange={(e) => setSelected(e.target.value as CurrencyCode)}
            className={cn(
              "h-12 w-full cursor-pointer appearance-none bg-light-grey pr-12 pl-4 text-body-2",
              focusRing,
            )}
          >
            {currencies.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={20}
            strokeWidth={1.5}
            aria-hidden
            className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2"
          />
        </div>

        <div className="mt-5 border-t border-stroke pt-4">
          <p className="text-body-4 tracking-[0.04em] uppercase">
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

        <button
          type="submit"
          className={cn(
            "mt-6 h-11 w-full bg-primary text-body-2 font-medium text-white transition-colors hover:bg-primary/90",
            focusRing,
          )}
        >
          Update Preference
        </button>
      </form>
    </section>
  );
}
