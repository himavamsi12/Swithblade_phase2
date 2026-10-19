/**
 * Money is stored as integer minor units (paise, cents) everywhere in the app.
 * Never do arithmetic on floats for prices.
 */
export function formatPrice(
  amountInMinorUnits: number,
  currency = "INR",
  locale = "en-IN",
) {
  return new Intl.NumberFormat(locale, { style: "currency", currency }).format(
    amountInMinorUnits / 100,
  );
}

/** Like `formatPrice`, but drops the ".00" from whole amounts ("₹4,990"). */
export function formatPriceCompact(
  amountInMinorUnits: number,
  currency = "INR",
  locale = "en-IN",
) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: amountInMinorUnits % 100 === 0 ? 0 : 2,
  }).format(amountInMinorUnits / 100);
}
