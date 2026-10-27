"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createLocalStore, useIsClient } from "@/lib/local-store";
import {
  convert,
  currencies,
  isCurrencyCode,
  type CurrencyCode,
  type Rates,
} from "./currencies";

/*
 * The shopper's preferred display currency, persisted in localStorage.
 * Prices are converted for display only; checkout still charges INR.
 */

export { currencies, type CurrencyCode };

type Preference = {
  currency: CurrencyCode | null;
  /** Chosen or closed the prompt, so it shouldn't open again. */
  answered: boolean;
};

const EMPTY: Preference = { currency: null, answered: false };

const parse = (v: unknown): Preference => {
  if (typeof v !== "object" || v === null) return EMPTY;
  const { currency, answered } = v as Record<string, unknown>;
  return {
    currency: isCurrencyCode(currency) ? currency : null,
    answered: answered === true,
  };
};

const store = createLocalStore("switchblade.currency.v1", parse, EMPTY);

export const currencyActions = {
  choose: (currency: CurrencyCode) => store.set({ currency, answered: true }),
  dismiss: () => store.set({ ...store.get(), answered: true }),
};

export function useCurrencyPreference() {
  return {
    ...store.useValue(),
    /** False during server render and hydration. */
    ready: useIsClient(),
  };
}

/* Exchange rates, fetched once per page load and only when first needed. */

let rates: Rates | null = null;
let ratesRequest: Promise<void> | null = null;
const rateListeners = new Set<() => void>();

function loadRates() {
  ratesRequest ??= fetch("/api/currency/rates")
    .then((res) => (res.ok ? res.json() : null))
    .then((body: { rates?: Rates } | null) => {
      if (!body?.rates) throw new Error("Rates unavailable");
      rates = body.rates;
      rateListeners.forEach((l) => l());
    })
    .catch(() => {
      // Prices stay in their original currency; retry on a later mount.
      ratesRequest = null;
    });
}

const subscribeRates = (listener: () => void) => {
  rateListeners.add(listener);
  return () => rateListeners.delete(listener);
};

function useRates(enabled: boolean) {
  useEffect(() => {
    if (enabled) loadRates();
  }, [enabled]);
  return useSyncExternalStore(
    subscribeRates,
    () => rates,
    () => null,
  );
}

/**
 * The shopper's display currency and a converter into it. Until a currency is
 * chosen and rates have loaded, `toDisplay` returns amounts unchanged.
 */
export function useDisplayCurrency() {
  const { currency } = store.useValue();
  const target = currency ?? "INR";
  const loaded = useRates(target !== "INR");

  const toDisplay = (amount: number, from: string) => {
    const converted =
      from === target
        ? amount
        : loaded && convert(amount, from, target, loaded);
    return typeof converted === "number"
      ? { amount: converted, currency: target, converted: from !== target }
      : { amount, currency: from, converted: false };
  };

  return { currency: target, toDisplay };
}
