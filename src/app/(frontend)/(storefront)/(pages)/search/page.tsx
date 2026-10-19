import type { Metadata } from "next";
import { ProductCard } from "@/features/catalog/components/product-card";
import {
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

  return (
    <div className="mx-auto w-full max-w-480 px-4 pb-24 md:px-10 md:pb-40">
      <header className="flex flex-col items-center gap-3 pt-12 text-center md:pt-24">
        <h1 className="text-h1 uppercase">{term ? `“${term}”` : "Search"}</h1>
        <p className="text-body-2 text-muted" role="status">
          {!term
            ? "Type in the search bar to find products."
            : results.length === 0
              ? "No products match your search."
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
