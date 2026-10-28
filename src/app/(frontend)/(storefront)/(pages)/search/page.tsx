import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { ProductCard } from "@/features/catalog/components/product-card";
import { YouMayAlsoLike } from "@/features/catalog/components/you-may-also-like";
import {
  listRecommendedProducts,
  SEARCH_MAX_LENGTH,
  searchProducts,
} from "@/features/catalog/repository";

export const metadata: Metadata = {
  title: "Search",
  // Endless query combinations: keep them out of search engines.
  robots: { index: false },
};

export default async function SearchPage({
  searchParams,
}: PageProps<"/search">) {
  const { q } = await searchParams;
  const term =
    (Array.isArray(q) ? q[0] : q)?.trim().slice(0, SEARCH_MAX_LENGTH) ?? "";
  const results = term ? await searchProducts(term) : [];

  if (term && results.length === 0) {
    const recommended = await listRecommendedProducts(8);
    return (
      <div className="mx-auto w-full max-w-480 px-4 pb-24 md:px-10 md:pb-40">
        <EmptyState
          as="h1"
          message={
            <>
              Your search &ldquo;{term}&rdquo; didn&apos;t match any results.
              <br />
              Look at other items in our store
            </>
          }
          action="Continue Shopping"
          className="pt-24 md:pt-[220px]"
        />
        <YouMayAlsoLike
          products={recommended}
          className="pt-24 md:pt-[160px]"
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-480 px-4 pb-24 md:px-10 md:pb-40">
      <header className="flex flex-col items-center gap-3 pt-12 text-center md:pt-24">
        <h1 className="text-h1 uppercase">{term ? `“${term}”` : "Search"}</h1>
        <p className="text-body-2 text-muted" role="status">
          {!term
            ? "Type in the search bar to find products."
            : `${results.length} ${results.length === 1 ? "product" : "products"}`}
        </p>
      </header>

      {results.length > 0 && (
        <ul className="mt-12 grid grid-cols-2 gap-x-3 gap-y-8 md:mt-[88px] md:grid-cols-3 md:gap-x-6 md:gap-y-10 lg:grid-cols-4">
          {results.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} variant="listing" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
