"use client";

import { Check } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { currencies, currencyActions, useCurrencyPreference } from "../store";

/**
 * Header currency switcher: the saved currency's symbol (₹ until one is
 * chosen), opening a small menu of display currencies beneath it. The symbol
 * is text in `currentColor`, so it follows the header's tone like the icons.
 */
export function HeaderCurrency({ className }: { className?: string }) {
  const code = useCurrencyPreference().currency ?? "INR";
  const current = currencies.find((c) => c.code === code) ?? currencies[0];
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const menuId = useId();

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
    <div ref={root} className="relative flex">
      <button
        ref={button}
        type="button"
        aria-label={`Currency: ${current.label}`}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "h-[17px] min-w-[17px] text-[18px] leading-none",
          className,
        )}
      >
        {current.symbol}
      </button>

      {/* Stays mounted so it can fade both ways; `inert` while closed. */}
      <div
        id={menuId}
        inert={!open}
        className={cn(
          "absolute top-full right-0 z-40 mt-5 w-64 origin-top-right bg-white text-black shadow-[0_16px_40px_rgb(0_0_0/0.14)] transition-[opacity,translate,visibility] duration-200 ease-out motion-reduce:transition-none",
          open ? "visible" : "invisible -translate-y-1 opacity-0",
        )}
      >
        <p className="px-5 pt-5 pb-2 text-body-4 tracking-[0.1em] text-muted uppercase">
          Shop in
        </p>
        <ul aria-label="Display currency" className="pb-2">
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
                  className="flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors hover:bg-light-grey focus-visible:bg-light-grey focus-visible:outline-none"
                >
                  <span
                    aria-hidden
                    className={cn(
                      "flex size-8 shrink-0 items-center justify-center rounded-full text-[14px] transition-colors",
                      selected ? "bg-primary text-white" : "bg-light-grey",
                    )}
                  >
                    {c.symbol}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="text-body-3 font-medium">{c.code}</span>
                    <span className="truncate text-body-4 text-muted">
                      {c.label.replace(/ \(.*\)$/, "")}
                    </span>
                  </span>
                  {selected && (
                    <Check
                      size={16}
                      strokeWidth={2}
                      aria-hidden
                      className="shrink-0 text-primary"
                    />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="border-t border-stroke px-5 py-3 text-body-4 text-muted">
          Prices are converted for display. Checkout is charged in INR.
        </p>
      </div>
    </div>
  );
}
