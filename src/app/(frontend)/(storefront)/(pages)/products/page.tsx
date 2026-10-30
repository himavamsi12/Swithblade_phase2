import type { Metadata, Route } from "next";
import { notFound } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import Link from "next/link";
import { ProductCard } from "@/features/catalog/components/product-card";
import {
  listAllProductsByCategory,
  listProducts,
} from "@/features/catalog/repository";
import {
  MobileFilterListing,
  type FilterOption,
} from "@/features/catalog/components/mobile-filter-listing";
import type { Product } from "@/features/catalog/types";

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

  const [{ items, total }, catalogProducts] = await Promise.all([
    listAllProductsByCategory(category.slug),
    listProducts(),
  ]);
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (page > pageCount) notFound();
  const pageItems = items.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const filterProducts = [...catalogProducts, ...items];
  const categoryOptions: FilterOption[] = [
    { label: category.title, value: category.slug },
    ...filterProducts.flatMap((product) => [
      ...(product.categories ?? []).map(({ slug, label }) => ({
        label,
        value: slug,
      })),
      ...(product.category
        ? [
            {
              label:
                product.categoryLabel ??
                product.category
                  .replaceAll("-", " ")
                  .replace(/\b\w/g, (c) => c.toUpperCase()),
              value: product.category,
            },
          ]
        : []),
    ]),
  ];
  const productTypeOptions = filterOptions(
    filterProducts,
    (product) => product.productType,
  );
  const collectionOptions = filterOptions(
    filterProducts,
    (product) => product.collectionName,
  );
  const sizeOptions = filterOptions(filterProducts, (product) =>
    product.sizes.filter((size) => size.available).map((size) => size.label),
  );
  const maxProductPrice = Math.max(0, ...items.map((product) => product.price));
  const priceMax = Math.max(50000, Math.ceil(maxProductPrice / 50000) * 50000);

  return (
    <div className="mx-auto w-full max-w-480 px-4 pb-24 md:px-10 md:pb-40">
      <nav
        aria-label="Breadcrumb"
        className="pt-10 text-sm leading-5 md:hidden"
      >
        <ol className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <li>
            <Link href="/" className="text-black/45">
              HOME
            </Link>
          </li>
          <li aria-hidden="true" className="text-black/45">
            /
          </li>
          <li>
            <Link href="/products" className="text-black/45">
              CATEGORIES
            </Link>
          </li>
          <li aria-hidden="true" className="text-black/45">
            /
          </li>
          <li
            aria-current="page"
            className="max-w-full min-w-0 break-words text-black"
          >
            {category.title.toUpperCase()}
          </li>
        </ol>
      </nav>

      <header className="flex flex-col items-center gap-3 pt-8 text-center md:pt-24">
        <h1 className="text-h1 uppercase">{category.title}</h1>
        <p className="max-w-[540px] text-body-2 leading-4">
          {category.description}
        </p>
      </header>

      <div className="mt-12 md:mt-[88px]">
        {/* Filter and sort options are not designed yet. */}
        <button
          type="button"
          className="hidden items-center gap-2.5 text-body-4 uppercase md:flex"
        >
          Filters &amp; sort
          <SlidersHorizontal size={14} aria-hidden />
        </button>
      </div>

      <MobileFilterListing
        products={items}
        categoryOptions={categoryOptions}
        productTypeOptions={productTypeOptions}
        collectionOptions={collectionOptions}
        sizeOptions={sizeOptions}
        priceMin={0}
        priceMax={priceMax}
        page={page}
        pageSize={PAGE_SIZE}
      />

      <ul className="mt-6 hidden grid-cols-2 gap-x-3 gap-y-8 md:grid md:grid-cols-3 md:gap-x-6 md:gap-y-10 lg:grid-cols-4">
        {pageItems.map((product) => (
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
        className="mt-16 hidden md:mt-[84px] md:flex"
      />
    </div>
  );
}

function filterOptions(
  products: Product[],
  getValues: (product: Product) => string | string[] | undefined,
): FilterOption[] {
  const options = new Map<string, FilterOption>();
  for (const product of products) {
    const values = getValues(product);
    for (const value of Array.isArray(values)
      ? values
      : values
        ? [values]
        : []) {
      options.set(value, { label: value, value });
    }
  }
  return [...options.values()].sort((a, b) => a.label.localeCompare(b.label));
}
