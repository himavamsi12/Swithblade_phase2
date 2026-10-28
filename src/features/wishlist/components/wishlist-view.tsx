"use client";

import { EmptyState } from "@/components/ui/empty-state";
import { useWishlist } from "../store";
import { WishlistCard } from "./wishlist-card";

/** Wishlist heading and the grid of saved products. */
export function WishlistView() {
  const { items, count, ready } = useWishlist();

  return (
    <>
      <h1 className="text-h4 font-semibold uppercase md:text-h3">
        Wishlist{" "}
        <span className="font-normal" aria-label={`${count} items`}>
          [{ready ? count : "…"}]
        </span>
      </h1>
      <div className="mt-4 border-t border-stroke" />

      {!ready ? (
        <div
          className="mt-8 grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-3 md:gap-x-8 lg:grid-cols-4"
          aria-hidden
        >
          {[0, 1].map((i) => (
            <div key={i} className="aspect-[297/348] animate-pulse bg-card" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          message="Your wishlist is empty"
          action="Discover more"
          className="pt-16 md:pt-28"
        />
      ) : (
        <ul className="mt-8 grid grid-cols-2 gap-x-3 gap-y-12 md:grid-cols-3 md:gap-x-8 lg:grid-cols-4">
          {items.map((item) => (
            <li key={item.productId}>
              <WishlistCard item={item} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
