import { Carousel } from "@/components/ui/carousel";
import { listProductsByCollection } from "../repository";
import type { ProductCollection } from "../types";
import { ProductCard } from "./product-card";

type ProductShelfProps = {
  title: string;
  collection: ProductCollection;
  /** Backdrop behind the product photos. */
  surface?: "card" | "cream";
};

/** Full-width, titled carousel of the products in a collection. */
export async function ProductShelf({
  title,
  collection,
  surface,
}: ProductShelfProps) {
  const products = await listProductsByCollection(collection);
  if (products.length === 0) return null;

  return (
    <div className="mx-auto w-full max-w-480 px-4 py-12 md:px-10 md:py-20">
      <Carousel title={title}>
        {products.map((product) => (
          <ProductCard key={product.id} product={product} surface={surface} />
        ))}
      </Carousel>
    </div>
  );
}
