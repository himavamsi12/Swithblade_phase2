import Link from "next/link";
import { Carousel } from "@/components/ui/carousel";
import { listProductsByCollection } from "../repository";
import type { ProductCollection } from "../types";
import { ProductCard } from "./product-card";

type ProductShelfProps = {
  title: string;
  collection: ProductCollection;
  /** Backdrop behind the product photos. */
  surface?: "card" | "cream";
  /** Home-only layout controls for the approved mobile design. */
  mobileHome?: boolean;
  mobileLayout?: "grid" | "carousel";
};

/** Full-width, titled carousel of the products in a collection. */
export async function ProductShelf({
  title,
  collection,
  surface,
  mobileHome = false,
  mobileLayout,
}: ProductShelfProps) {
  const products = await listProductsByCollection(collection);
  if (products.length === 0) return null;

  const carousel = (
    <Carousel
      title={title}
      itemClassName={
        mobileHome && mobileLayout === "carousel"
          ? "shrink-0 basis-[65.17vw] snap-start md:basis-[calc((100%-24px)/3)] lg:basis-[calc((100%-48px)/5)]"
          : undefined
      }
      hideMobileControls={mobileHome && mobileLayout === "carousel"}
    >
      {products.map((product) => (
        <ProductCard key={product.id} product={product} surface={surface} />
      ))}
    </Carousel>
  );

  return (
    <div
      className={
        mobileHome
          ? "mx-auto w-full max-w-480 px-5 pt-8 pb-12 md:px-10 md:py-20"
          : "mx-auto w-full max-w-480 px-4 py-12 md:px-10 md:py-20"
      }
    >
      {mobileLayout === "grid" && (
        <section aria-label={title} className="md:hidden">
          <div className="mb-14 flex items-center justify-between">
            <h2 className="text-[24px] leading-9 font-semibold uppercase">
              {title}
            </h2>
            <Link
              href="/products"
              className="text-[12px] leading-4 tracking-[0.08em] uppercase underline underline-offset-4"
            >
              View all
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-x-3 gap-y-4">
            {products.slice(0, 4).map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                surface={surface}
                mobileGrid
              />
            ))}
          </div>
        </section>
      )}
      <div className={mobileLayout === "grid" ? "hidden md:block" : undefined}>
        {carousel}
      </div>
    </div>
  );
}
