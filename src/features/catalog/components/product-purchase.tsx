"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { cartActions } from "@/features/cart/store";
import { cn } from "@/lib/utils";
import type { Product, ProductColor, ProductSize } from "../types";
import { ColorPicker, firstAvailableSize, SizePicker } from "./option-pickers";
import { SizeGuideDialog } from "./size-guide-dialog";

type ProductPurchaseProps = {
  product: Pick<
    Product,
    "id" | "slug" | "name" | "price" | "currency" | "image" | "inStock"
  >;
  colors: ProductColor[];
  sizes: ProductSize[];
  /** Model photo shown in the size guide. */
  modelImage: string | null;
};

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/** Colour and size pickers with the add-to-bag actions. */
export function ProductPurchase({
  product,
  colors,
  sizes,
  modelImage,
}: ProductPurchaseProps) {
  const [colorIndex, setColorIndex] = useState(0);
  const [size, setSize] = useState(() => firstAvailableSize(sizes));
  const router = useRouter();
  const [justAdded, setJustAdded] = useState(false);

  // "Added to Bag" confirmation resets after a moment.
  useEffect(() => {
    if (!justAdded) return;
    const t = setTimeout(() => setJustAdded(false), 2000);
    return () => clearTimeout(t);
  }, [justAdded]);

  const needsSize = sizes.length > 0 && !size;
  const canBuy = product.inStock && !needsSize;

  const addToBag = () => {
    cartActions.add({
      productId: product.id,
      slug: product.slug,
      name: product.name,
      image: product.image,
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

      <SizePicker sizes={sizes} value={size} onChange={setSize}>
        <SizeGuideDialog
          modelImage={modelImage}
          productName={product.name}
          sizes={sizes}
          onSelectSize={setSize}
        />
      </SizePicker>

      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          disabled={!canBuy}
          onClick={() => {
            addToBag();
            setJustAdded(true);
          }}
          className={cn(
            "h-10 bg-primary text-body-2 text-white transition-opacity hover:opacity-90 disabled:bg-stroke disabled:text-muted disabled:hover:opacity-100",
            focusRing,
          )}
        >
          {!product.inStock
            ? "Out of stock"
            : justAdded
              ? "Added to Bag ✓"
              : "Add to Bag"}
        </button>
        <button
          type="button"
          disabled={!canBuy}
          onClick={() => {
            addToBag();
            router.push("/cart");
          }}
          className={cn(
            "h-10 border border-primary bg-white text-body-2 text-primary transition-colors hover:bg-card disabled:border-stroke disabled:text-muted disabled:hover:bg-white",
            focusRing,
          )}
        >
          Buy now
        </button>
      </div>
      <p className="sr-only" aria-live="polite">
        {justAdded ? `${product.name} added to your bag.` : ""}
      </p>
    </div>
  );
}
