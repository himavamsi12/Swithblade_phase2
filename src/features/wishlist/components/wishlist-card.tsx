"use client";

import { X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { cartActions } from "@/features/cart/store";
import {
  ColorPicker,
  firstAvailableSize,
  SizePicker,
} from "@/features/catalog/components/option-pickers";
import { formatPriceCompact } from "@/lib/format";
import { cn } from "@/lib/utils";
import { wishlistActions } from "../store";
import type { WishlistItem } from "../wishlist";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/** A saved product with its own colour/size choice and Add to Bag. */
export function WishlistCard({ item }: { item: WishlistItem }) {
  const [colorIndex, setColorIndex] = useState(0);
  const [size, setSize] = useState(() => firstAvailableSize(item.sizes));
  const [justAdded, setJustAdded] = useState(false);
  const href = `/products/${item.slug}` as const;

  useEffect(() => {
    if (!justAdded) return;
    const t = setTimeout(() => setJustAdded(false), 2000);
    return () => clearTimeout(t);
  }, [justAdded]);

  const canBuy = item.inStock && (item.sizes.length === 0 || size !== null);

  return (
    <article className="flex flex-col" aria-label={item.name}>
      <div className="relative aspect-[297/348] overflow-hidden bg-card">
        <Link href={href} className={cn("absolute inset-0", focusRing)}>
          {item.image && (
            <span
              className="absolute inset-0"
              style={
                item.imageFrame && {
                  inset: "auto",
                  left: `${item.imageFrame.left}%`,
                  top: `${item.imageFrame.top}%`,
                  width: `${item.imageFrame.width}%`,
                  height: `${item.imageFrame.height}%`,
                }
              }
            >
              <Image
                src={item.image}
                alt={item.name}
                fill
                sizes="(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
                className="object-cover"
              />
            </span>
          )}
        </Link>
        <button
          type="button"
          onClick={() => wishlistActions.remove(item.productId)}
          aria-label={`Remove ${item.name} from wishlist`}
          className={cn(
            "absolute top-3 right-3 flex size-7 items-center justify-center text-black transition-opacity hover:opacity-60",
            focusRing,
          )}
        >
          <X size={18} strokeWidth={1.5} aria-hidden />
        </button>
      </div>

      <div className="mt-4 flex items-start justify-between gap-3">
        <Link
          href={href}
          className={cn("text-body-2 uppercase hover:underline", focusRing)}
        >
          {item.name}
        </Link>
        <p className="text-body-2 font-semibold">
          {formatPriceCompact(item.price, item.currency)}
        </p>
      </div>

      <div className="mt-4 flex flex-col gap-4">
        <ColorPicker
          colors={item.colors}
          value={colorIndex}
          onChange={setColorIndex}
          density="compact"
        />
        <SizePicker
          sizes={item.sizes}
          value={size}
          onChange={setSize}
          density="compact"
          selectedClassName="border-black"
        />
      </div>

      <button
        type="button"
        disabled={!canBuy}
        onClick={() => {
          cartActions.add({
            productId: item.productId,
            slug: item.slug,
            name: item.name,
            image: item.image,
            price: item.price,
            currency: item.currency,
            color: item.colors[colorIndex]?.name ?? null,
            size,
          });
          setJustAdded(true);
        }}
        className={cn(
          "mt-4 h-10 w-full bg-primary text-body-2 text-white transition-opacity hover:opacity-90 disabled:bg-stroke disabled:text-muted disabled:hover:opacity-100",
          focusRing,
        )}
      >
        {!item.inStock
          ? "Out of stock"
          : justAdded
            ? "Added to Bag ✓"
            : "Add to Bag"}
      </button>
      <span className="sr-only" aria-live="polite">
        {justAdded ? `${item.name} added to your bag.` : ""}
      </span>
    </article>
  );
}
