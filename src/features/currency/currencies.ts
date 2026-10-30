/** Display currencies the shopper can pick. Checkout always charges INR. */
export const currencies = [
  { code: "INR", label: "Indian Rupees (₹)", symbol: "₹", locale: "en-IN" },
  { code: "USD", label: "US Dollars ($)", symbol: "$", locale: "en-US" },
  { code: "EUR", label: "Euros (€)", symbol: "€", locale: "en-IE" },
  { code: "GBP", label: "British Pounds (£)", symbol: "£", locale: "en-GB" },
  { code: "AED", label: "UAE Dirhams (د.إ)", symbol: "د.إ", locale: "en-AE" },
] as const;

export type CurrencyCode = (typeof currencies)[number]["code"];

/** How many units of each currency one rupee buys. */
export type Rates = Record<CurrencyCode, number>;

export const isCurrencyCode = (v: unknown): v is CurrencyCode =>
  currencies.some((c) => c.code === v);

/**
 * Converts integer minor units between currencies. Every supported currency
 * has two decimals, so minor units convert directly. Returns null when either
 * side has no rate.
 */
export function convert(
  amountInMinorUnits: number,
  from: string,
  to: CurrencyCode,
  rates: Rates,
) {
  if (from === to) return amountInMinorUnits;
  if (!isCurrencyCode(from)) return null;
  return Math.round((amountInMinorUnits / rates[from]) * rates[to]);
}
