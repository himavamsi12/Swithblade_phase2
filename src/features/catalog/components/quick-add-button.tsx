"use client";

import { Check, ShoppingCartPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { cartActions } from "@/features/cart/store";
import type { CartItemInput } from "@/features/cart/types";
import { cn } from "@/lib/utils";

/**
 * Blue add-to-bag square on product cards. Adds the default colour and first
 * available size without leaving the page; the product page is one click
 * away for other options.
 */
export function QuickAddButton({
  item,
  className,
}: {
  item: CartItemInput;
  className?: string;
}) {
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 1500);
    return () => clearTimeout(t);
  }, [added]);

  const details = [item.color, item.size && `size ${item.size}`]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <button
        type="button"
        onClick={() => {
          cartActions.add(item);
          setAdded(true);
        }}
        aria-label={`Add ${item.name}${details ? ` (${details})` : ""} to bag`}
        className={cn(
          "flex size-11 items-center justify-center bg-primary text-white transition-[opacity,transform] duration-200 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-95 md:size-[52px]",
          className,
        )}
      >
        {added ? (
          <Check size={22} strokeWidth={1.75} aria-hidden />
        ) : (
          <ShoppingCartPlus size={22} strokeWidth={1.75} aria-hidden />
        )}
      </button>
      <span className="sr-only" aria-live="polite">
        {added ? `${item.name} added to your bag.` : ""}
      </span>
    </>
  );
}
