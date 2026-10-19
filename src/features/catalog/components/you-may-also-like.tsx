import { Carousel } from "@/components/ui/carousel";
import { cn } from "@/lib/utils";
import type { Product } from "../types";
import { ProductCard } from "./product-card";

/** Product row ("You may also like", "Recommended"): four listing cards per view on desktop. */
export function YouMayAlsoLike({
  products,
  title = "You may also like",
  className,
}: {
  products: Product[];
  title?: string;
  className?: string;
}) {
  if (products.length === 0) return null;
  return (
    <div className={className}>
      <Carousel
        title={title}
        trackClassName="gap-3 md:gap-6"
        itemClassName={cn(
          "shrink-0 basis-[calc((100%-12px)/2)] snap-start",
          "md:basis-[calc((100%-48px)/3)] lg:basis-[calc((100%-72px)/4)]",
        )}
      >
        {products.map((item) => (
          <ProductCard key={item.id} product={item} variant="listing" />
        ))}
      </Carousel>
    </div>
  );
}
