"use client";

import { formatPrice, formatPriceCompact } from "@/lib/format";
import { currencies } from "../currencies";
import { useDisplayCurrency } from "../store";

type PriceProps = {
  /** Integer minor units in `currency`. */
  amount: number;
  currency: string;
  /** Drop ".00" from whole amounts, as on product cards. */
  compact?: boolean;
};

/**
 * A price shown in the shopper's chosen display currency. Renders the
 * original amount on the server and until exchange rates load.
 */
export function Price({ amount, currency, compact = false }: PriceProps) {
  const { toDisplay } = useDisplayCurrency();
  const shown = toDisplay(amount, currency);
  const locale =
    currencies.find((c) => c.code === shown.currency)?.locale ?? "en-IN";
  const format = compact ? formatPriceCompact : formatPrice;

  return (
    <span
      title={
        shown.converted
          ? `Approximate. Charged as ${formatPrice(amount, currency)} at checkout`
          : undefined
      }
    >
      {format(shown.amount, shown.currency, locale)}
    </span>
  );
}
