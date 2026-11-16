"use client";

import { Check, ChevronDown, Globe } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { currencies, currencyActions, useCurrencyPreference } from "../store";

/**
 * Header currency switcher: a globe, the saved currency's code ("INR" until
 * one is chosen) and a chevron, opening a "Select currency" panel. Drawn in
 * `currentColor`, so the trigger follows the header's tone like the icons.
 */
export function HeaderCurrency({ className }: { className?: string }) {
  const code = useCurrencyPreference().currency ?? "INR";
  const current = currencies.find((c) => c.code === code) ?? currencies[0];
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    // Desktop only; phones pick the currency inside the menu
    // (MobileCurrencyMenu).
    <div ref={root} className="relative hidden md:flex">
      <button
        ref={button}
        type="button"
        aria-label={`Currency: ${current.label}`}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
        className={cn("h-[17px] min-w-[17px] gap-1.5 leading-none", className)}
      >
        <Globe size={17} strokeWidth={1} absoluteStrokeWidth aria-hidden />
        <span
          aria-hidden
          className="text-[12px] font-semibold tracking-[0.1em]"
        >
          {current.code}
        </span>
        <ChevronDown
          size={12}
          strokeWidth={1.5}
          aria-hidden
          className={cn(
            "transition-transform duration-200 motion-reduce:transition-none",
            open && "rotate-180",
          )}
        />
      </button>

      {/* Stays mounted so it can fade both ways; `inert` while closed. */}
      <div
        id={menuId}
        role="group"
        aria-labelledby={titleId}
        inert={!open}
        className={cn(
          "absolute top-full z-40 bg-white text-black shadow-[0_16px_40px_rgb(0_0_0/0.14)] transition-[opacity,translate,visibility] duration-200 ease-out motion-reduce:transition-none",
          "right-0 mt-5 w-[440px] origin-top-right",
          open ? "visible" : "invisible -translate-y-1 opacity-0",
        )}
      >
        <div className="border-b border-stroke px-7 pt-7 pb-6">
          <p
            id={titleId}
            className="text-[15px] font-semibold tracking-[0.12em] uppercase"
          >
            Select currency
          </p>
        </div>

        <ul aria-label="Display currency" className="p-2.5">
          {currencies.map((c) => {
            const selected = c.code === code;
            return (
              <li key={c.code}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    currencyActions.choose(c.code);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-center gap-4 px-4 py-4 text-left transition-colors focus-visible:outline-none",
                    selected
                      ? "bg-primary/[0.06]"
                      : "hover:bg-light-grey/60 focus-visible:bg-light-grey/60",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-12 shrink-0 items-center justify-center text-[18px] font-semibold transition-colors",
                      selected ? "bg-primary text-white" : "bg-light-grey",
                    )}
                  >
                    {c.symbol}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="text-body-2 font-semibold">{c.code}</span>
                    <span className="truncate text-body-3 text-muted">
                      {c.name}
                    </span>
                  </span>
                  {selected && (
                    <Check
                      size={20}
                      strokeWidth={2}
                      aria-hidden
                      className="mr-1 shrink-0 text-primary"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>

        <p className="border-t border-stroke px-7 py-4 text-body-4 text-muted">
          Prices are converted for display. Checkout is charged in INR.
        </p>
      </div>
    </div>
  );
}
