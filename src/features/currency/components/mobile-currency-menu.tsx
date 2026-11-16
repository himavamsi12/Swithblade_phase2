"use client";

import { Check } from "lucide-react";
import { useId, useState } from "react";
import { cn } from "@/lib/utils";
import { currencies, currencyActions, useCurrencyPreference } from "../store";

/**
 * Currency accordion row in the phone menu, matching the Categories row:
 * "Currency" with the saved code, opening the list of currencies. Picking one
 * saves it and folds the list away.
 */
export function MobileCurrencyMenu() {
  const code = useCurrencyPreference().currency ?? "INR";
  const [open, setOpen] = useState(false);
  const listId = useId();

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-14 w-full items-center justify-between py-4 text-left text-sm tracking-[0.12em] uppercase"
      >
        Currency
        <span className="ml-4 flex items-center gap-3">
          <span className="text-xs text-muted">{code}</span>
          <span
            aria-hidden="true"
            className={cn(
              "inline-block h-2 w-2 rotate-45 border-r border-b transition-transform duration-300 motion-reduce:transition-none",
              open && "-translate-y-0.5 rotate-[225deg]",
            )}
          />
        </span>
      </button>

      {/* Rows 0fr → 1fr animates to the list's natural height. */}
      <div
        id={listId}
        inert={!open}
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <ul
            aria-label="Display currency"
            className="mb-3 flex flex-col border-t border-black/10 pl-3 [&>li:last-child>button]:border-b-0"
          >
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
                    className="flex w-full items-center gap-3 border-b border-black/10 py-3 text-left text-xs tracking-[0.1em] uppercase"
                  >
                    <span aria-hidden className="w-5 shrink-0 text-center">
                      {c.symbol}
                    </span>
                    <span className="flex-1">
                      {c.code}
                      <span className="ml-2 tracking-normal text-muted normal-case">
                        {c.name}
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
          <p className="mb-5 pl-3 text-body-4 text-muted">
            Prices are converted for display. Checkout is charged in INR.
          </p>
        </div>
      </div>
    </>
  );
}
