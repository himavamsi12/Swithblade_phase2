"use client";

import { useDisplayCurrency } from "../store";

/**
 * Tells the shopper that converted prices are estimates and checkout charges
 * the original currency. Renders nothing when no conversion is shown.
 */
export function ChargeNote({
  currency,
  className,
}: {
  currency: string;
  className?: string;
}) {
  const { toDisplay } = useDisplayCurrency();
  if (!toDisplay(0, currency).converted) return null;

  return (
    <p className={className}>
      Prices are approximate. You&apos;ll be charged in {currency} at checkout.
    </p>
  );
}
