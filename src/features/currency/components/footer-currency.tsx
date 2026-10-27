"use client";

import { ChevronDown } from "lucide-react";
import { useId } from "react";
import {
  currencies,
  currencyActions,
  useCurrencyPreference,
  type CurrencyCode,
} from "../store";

/**
 * Footer currency switcher. Shares the preference with `CurrencyPrompt`, so
 * picking here also stops the page-load prompt from showing.
 */
export function FooterCurrency() {
  const { currency } = useCurrencyPreference();
  const selectId = useId();
  const current = currencies.find((c) => c.code === currency) ?? currencies[0];

  return (
    <div className="py-[18px]">
      <label
        htmlFor={selectId}
        className="block text-body-4 font-semibold tracking-[2px] uppercase"
      >
        Currency
      </label>
      {/* Native select stretched invisibly over the styled value. */}
      <div className="relative mt-3 inline-flex items-center gap-3 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-current">
        <span
          aria-hidden
          className="text-[18px] leading-tight whitespace-nowrap uppercase"
        >
          {current.code} - {current.label}
        </span>
        <ChevronDown size={22} strokeWidth={1.5} aria-hidden />
        <select
          id={selectId}
          value={current.code}
          onChange={(e) =>
            currencyActions.choose(e.target.value as CurrencyCode)
          }
          className="absolute inset-0 cursor-pointer appearance-none text-black opacity-0"
        >
          {currencies.map((c) => (
            <option key={c.code} value={c.code}>
              {c.code} - {c.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
