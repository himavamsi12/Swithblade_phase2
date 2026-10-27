import Image from "next/image";
import Link from "next/link";
import { Price } from "@/features/currency/components/price";
import { cn } from "@/lib/utils";
import type { Product } from "../types";
import { QuickAddButton } from "./quick-add-button";
import { StarBadge } from "./star-badge";

type ProductCardProps = {
  product: Product;
  /** Backdrop behind the product photo. */
  surface?: "card" | "cream";
  /**
   * "shelf": name over price, for carousels.
   * "listing": name and price on one line with the colour count below, for grids.
   */
  variant?: "shelf" | "listing";
};

export function ProductCard({
  product,
  surface = "card",
  variant = "shelf",
}: ProductCardProps) {
  const listing = variant === "listing";
  const price = (
    <Price amount={product.price} currency={product.currency} compact />
  );
  const href = `/products/${product.slug}` as const;
  const sizes = listing
    ? "(min-width: 1024px) 25vw, (min-width: 768px) 33vw, 50vw"
    : "(min-width: 1024px) 20vw, (min-width: 768px) 33vw, 50vw";

  // Shelf cards get quick add: default colour, first size that isn't sold out.
  const defaultSize = product.sizes.length
    ? (product.sizes.find((s) => s.available)?.label ?? null)
    : null;
  const canQuickAdd =
    !listing && product.inStock && (product.sizes.length === 0 || defaultSize);

  return (
    <article className="group relative flex flex-col gap-4">
      <div
        className={cn(
          "relative overflow-hidden",
          listing ? "aspect-[322/348]" : "aspect-[262.4/324]",
          surface === "cream" ? "bg-cream" : "bg-card",
        )}
      >
        {product.image && (
          <div
            className={cn(
              "absolute inset-0 transition-opacity duration-500",
              product.hoverImage && "group-hover:opacity-0",
            )}
            style={
              product.imageFrame && {
                inset: "auto",
                left: `${product.imageFrame.left}%`,
                top: `${product.imageFrame.top}%`,
                width: `${product.imageFrame.width}%`,
                height: `${product.imageFrame.height}%`,
              }
            }
          >
            <Image
              src={product.image}
              alt=""
              fill
              sizes={sizes}
              className="object-cover"
            />
          </div>
        )}
        {product.hoverImage && (
          // Second photo (e.g. on a model), revealed on hover.
          <Image
            src={product.hoverImage}
            alt=""
            fill
            sizes={sizes}
            className="object-cover opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          />
        )}
        {product.highlighted && (
          <StarBadge className="absolute top-4 left-4 h-[44px] w-[29px]" />
        )}
        {canQuickAdd && (
          <QuickAddButton
            item={{
              productId: product.id,
              slug: product.slug,
              name: product.name,
              image: product.image,
              price: product.price,
              currency: product.currency,
              color: product.colors[0]?.name ?? null,
              size: defaultSize,
            }}
            // Above the card-wide link; shown on hover or keyboard focus, and
            // always on touch screens, which have no hover.
            className="absolute right-3 bottom-3 z-10 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 md:right-3.5 md:bottom-3.5 pointer-coarse:opacity-100"
          />
        )}
      </div>

      {listing ? (
        <div className="flex flex-col gap-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-body-2 text-black uppercase group-hover:underline">
              <CardLink href={href}>{product.name}</CardLink>
            </h3>
            <p className="text-body-2 font-semibold text-black">{price}</p>
          </div>
          {product.colorCount && (
            <p className="text-body-3 text-muted">
              {product.colorCount}{" "}
              {product.colorCount === 1 ? "Color" : "Colors"}
            </p>
          )}
          {!product.inStock && (
            <p className="text-body-3 text-muted">Out of stock</p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-1">
          <h3 className="text-body-2 text-black uppercase group-hover:underline">
            <CardLink href={href}>{product.name}</CardLink>
          </h3>
          <p className="text-body-2 text-muted">{price}</p>
          {!product.inStock && (
            <p className="text-body-3 text-muted">Out of stock</p>
          )}
        </div>
      )}
    </article>
  );
}

/**
 * The product name link, stretched over the whole card so the photo and text
 * are all clickable, while the quick-add button stays its own control.
 */
function CardLink({
  href,
  children,
}: {
  href: `/products/${string}`;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="after:absolute after:inset-0 focus-visible:outline-none focus-visible:after:outline-2 focus-visible:after:outline-offset-4 focus-visible:after:outline-primary"
    >
      {children}
    </Link>
  );
}
