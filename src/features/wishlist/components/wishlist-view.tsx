"use client";

import Link from "next/link";
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
        <div className="flex flex-col items-start gap-4 py-16">
          <p className="text-body-1">Your wishlist is empty.</p>
          <p className="text-body-2 text-muted">
            Tap the heart on any product to save it here.
          </p>
          <Link
            href="/products"
            className="mt-2 inline-flex h-12 items-center bg-primary px-8 text-body-2 text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Continue shopping
          </Link>
        </div>
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
