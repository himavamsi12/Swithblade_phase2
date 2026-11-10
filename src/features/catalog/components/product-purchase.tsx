"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cartActions, openCart } from "@/features/cart/store";
import { cn } from "@/lib/utils";
import type { Product, ProductSize } from "../types";
import { ColorPicker, SizePicker } from "./option-pickers";
import { useProductColor } from "./product-color";
import { SizeGuideDialog } from "./size-guide-dialog";

type ProductPurchaseProps = {
  product: Pick<
    Product,
    "id" | "slug" | "name" | "price" | "currency" | "image" | "inStock"
  >;
  sizes: ProductSize[];
  /** Model photo shown in the size guide. */
  modelImage: string | null;
};

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/**
 * Colour and size pickers with the add-to-bag actions. The colour is shared
 * with the gallery through ProductColorProvider.
 */
export function ProductPurchase({
  product,
  sizes,
  modelImage,
}: ProductPurchaseProps) {
  const {
    colors,
    index: colorIndex,
    setIndex: setColorIndex,
  } = useProductColor();
  // No size until the shopper picks one (or the size guide picks it).
  const [size, setSize] = useState<string | null>(null);
  // Set when they try to buy before picking a size.
  const [askSize, setAskSize] = useState(false);
  const chooseSize = (label: string) => {
    setSize(label);
    setAskSize(false);
  };
  const router = useRouter();
  const [justAdded, setJustAdded] = useState(false);

  // "Added to Bag" confirmation resets after a moment.
  useEffect(() => {
    if (!justAdded) return;
    const t = setTimeout(() => setJustAdded(false), 2000);
    return () => clearTimeout(t);
  }, [justAdded]);

  const needsSize = sizes.length > 0 && !size;
  const canBuy = product.inStock;
  /** Runs `buy` once a size is chosen; until then asks for one. */
  const withSize = (buy: () => void) => () => {
    if (needsSize) {
      setAskSize(true);
      return;
    }
    buy();
  };

  const addToBag = () => {
    cartActions.add({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: colors[colorIndex]?.image ?? product.image,
      price: product.price,
      currency: product.currency,
      color: colors[colorIndex]?.name ?? null,
      size,
    });
  };

  return (
    <div className="flex flex-col gap-8">
      <ColorPicker
        colors={colors}
        value={colorIndex}
        onChange={setColorIndex}
      />

      <SizePicker sizes={sizes} value={size} onChange={chooseSize}>
        <SizeGuideDialog
          modelImage={modelImage}
          productName={product.name}
          sizes={sizes}
          onSelectSize={chooseSize}
        />
      </SizePicker>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={!canBuy}
          onClick={withSize(() => {
            addToBag();
            setJustAdded(true);
            openCart();
          })}
          className={cn(
            "h-10 bg-primary text-body-2 text-white transition-opacity hover:opacity-90 disabled:bg-stroke disabled:text-muted disabled:hover:opacity-100",
            focusRing,
          )}
        >
          {!product.inStock
            ? "Out of stock"
            : askSize
              ? "Select a size"
              : justAdded
                ? "Added to Bag ✓"
                : "Add to Bag"}
        </button>
        <button
          type="button"
          disabled={!canBuy}
          onClick={withSize(() => {
            addToBag();
            router.push("/cart");
          })}
          className={cn(
            "h-10 border border-primary bg-white text-body-2 text-primary transition-colors hover:bg-card disabled:border-stroke disabled:text-muted disabled:hover:bg-white",
            focusRing,
          )}
        >
          Buy now
        </button>
      </div>
      <p className="sr-only" aria-live="polite">
        {askSize
          ? "Select a size first."
          : justAdded
            ? `${product.name} added to your bag.`
            : ""}
      </p>
    </div>
  );
}
