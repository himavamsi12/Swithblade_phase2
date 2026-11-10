"use client";

import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWishlist, wishlistActions } from "../store";
import type { WishlistItem } from "../wishlist";

/** Heart toggle on the product page and cards: filled when the product is saved. */
export function WishlistButton({
  item,
  className,
  iconClassName = "size-[22px] md:size-5",
}: {
  item: WishlistItem;
  className?: string;
  /** The heart's size: 22px on phones, 20px from tablet up by default. */
  iconClassName?: string;
}) {
  const { has, ready } = useWishlist();
  const saved = ready && has(item.productId);

  return (
    <>
      <button
        type="button"
        onClick={() => wishlistActions.toggle(item)}
        aria-pressed={saved}
        aria-label={saved ? "Remove from wishlist" : "Add to wishlist"}
        className={cn(
          "transition-transform focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-90",
          className,
        )}
      >
        <Heart
          aria-hidden
          strokeWidth={1.5}
          className={cn(iconClassName, saved && "fill-black")}
        />
      </button>
      <span className="sr-only" aria-live="polite">
        {ready ? (saved ? `${item.name} saved to your wishlist.` : "") : ""}
      </span>
    </>
  );
}
