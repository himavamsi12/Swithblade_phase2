import { EUR, GBP, USD } from "@payloadcms/plugin-ecommerce";
import type { CurrenciesConfig } from "@payloadcms/plugin-ecommerce/types";

const INR = {
  code: "INR",
  decimals: 2,
  label: "Indian Rupee",
  symbol: "₹",
};

/**
 * Currencies the store can price in. Amounts are stored as integers in the
 * smallest unit (cents, paise), matching the storefront's money rule.
 *
 * Adding a currency adds price columns to products and variants, so it needs
 * a database migration.
 */
export const currenciesConfig: CurrenciesConfig = {
  defaultCurrency: "INR",
  supportedCurrencies: [USD, EUR, GBP, INR],
};

export const currencyOptions = currenciesConfig.supportedCurrencies.map(
  (c) => ({ label: `${c.code} (${c.symbol})`, value: c.code }),
);
