import type { Metadata, Route } from "next";
import { notFound } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import { ProductCard } from "@/features/catalog/components/product-card";
import { listProductsByCategory } from "@/features/catalog/repository";

const PAGE_SIZE = 20;

// Only the Sweatshirts listing is designed so far; more categories will
// become a route param.
const category = {
  slug: "sweatshirts",
  title: "Sweatshirts",
  description:
    "Each season, collection continues to evolve, presenting cutting-edge garments that combine research and experimentation on textiles, treatments, and garment dyeing techniques with true functionality.",
};

export const metadata: Metadata = {
  title: category.title,
  description: category.description,
};

export default async function ProductsPage({
  searchParams,
}: PageProps<"/products">) {
  const { page: pageParam } = await searchParams;
  const raw = Number(Array.isArray(pageParam) ? pageParam[0] : pageParam);
  const page = Number.isInteger(raw) && raw >= 1 ? raw : 1;

  const { items, pageCount } = await listProductsByCategory(category.slug, {
    page,
    pageSize: PAGE_SIZE,
  });
  if (page > pageCount) notFound();

  return (
    <div className="mx-auto w-full max-w-480 px-4 pb-24 md:px-10 md:pb-40">
      <header className="flex flex-col items-center gap-3 pt-12 text-center md:pt-24">
        <h1 className="text-h1 uppercase">{category.title}</h1>
        <p className="max-w-[540px] text-body-2 leading-4">
          {category.description}
        </p>
      </header>

      <div className="mt-12 md:mt-[88px]">
        {/* Filter and sort options are not designed yet. */}
        <button
          type="button"
          className="flex items-center gap-2.5 text-body-4 uppercase"
        >
          Filters &amp; sort
          <SlidersHorizontal size={14} aria-hidden />
        </button>
      </div>

      <ul className="mt-6 grid grid-cols-2 gap-x-3 gap-y-8 md:grid-cols-3 md:gap-x-6 md:gap-y-10 lg:grid-cols-4">
        {items.map((product) => (
          <li key={product.id}>
            <ProductCard product={product} variant="listing" />
          </li>
        ))}
      </ul>

      <Pagination
        page={page}
        pageCount={pageCount}
        hrefFor={(n) =>
          (n === 1 ? "/products" : `/products?page=${n}`) as Route
        }
        className="mt-16 md:mt-[84px]"
      />
    </div>
  );
}
