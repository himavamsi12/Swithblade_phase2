"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { Pagination } from "@/components/ui/pagination";
import { formatPriceCompact } from "@/lib/format";
import { ProductCard } from "./product-card";
import type { Product } from "../types";

export type FilterOption = {
  label: string;
  value: string;
};

type Filters = {
  categories: string[];
  productTypes: string[];
  collections: string[];
  sizes: string[];
  minPrice: number;
  maxPrice: number;
  sort: SortOption;
};

type SortOption = "best-seller" | "newest" | "price-low" | "price-high";

type MobileFilterListingProps = {
  products: Product[];
  categoryOptions: FilterOption[];
  productTypeOptions: FilterOption[];
  collectionOptions: FilterOption[];
  sizeOptions: FilterOption[];
  priceMin: number;
  priceMax: number;
  page: number;
  pageSize: number;
};

const sortOptions: { label: string; value: SortOption }[] = [
  { label: "Best seller", value: "best-seller" },
  { label: "Newest", value: "newest" },
  { label: "Price: low to high", value: "price-low" },
  { label: "Price: high to low", value: "price-high" },
];

function uniqueOptions(options: FilterOption[]) {
  return [...new Map(options.map((option) => [option.value, option])).values()]
    .filter((option) => option.value)
    .sort((a, b) => a.label.localeCompare(b.label));
}

function defaultFilters(priceMin: number, priceMax: number): Filters {
  return {
    categories: [],
    productTypes: [],
    collections: [],
    sizes: [],
    minPrice: priceMin,
    maxPrice: priceMax,
    sort: "best-seller",
  };
}

function toggleValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((entry) => entry !== value)
    : [...values, value];
}

export function MobileFilterListing({
  products,
  categoryOptions,
  productTypeOptions,
  collectionOptions,
  sizeOptions,
  priceMin,
  priceMax,
  page,
  pageSize,
}: MobileFilterListingProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [draft, setDraft] = useState(() => defaultFilters(priceMin, priceMax));
  const [applied, setApplied] = useState(() =>
    defaultFilters(priceMin, priceMax),
  );
  const [currentPage, setCurrentPage] = useState(page);
  const closeTimer = useRef<number | null>(null);

  useEffect(() => {
    setCurrentPage(page);
  }, [page]);

  useEffect(() => {
    if (!mounted) return;

    const bodyOverflow = document.body.style.overflow;
    const rootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDrawer();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = rootOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [mounted]);

  useEffect(
    () => () => {
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    },
    [],
  );

  const categoryChoices = useMemo(
    () => uniqueOptions(categoryOptions),
    [categoryOptions],
  );
  const productTypeChoices = useMemo(
    () => uniqueOptions(productTypeOptions),
    [productTypeOptions],
  );
  const collectionChoices = useMemo(
    () => uniqueOptions(collectionOptions),
    [collectionOptions],
  );
  const sizeChoices = useMemo(() => uniqueOptions(sizeOptions), [sizeOptions]);

  const filteredProducts = useMemo(() => {
    const filtered = products.filter((product) => {
      if (
        applied.categories.length > 0 &&
        !(
          product.categories?.some((category) =>
            applied.categories.includes(category.slug),
          ) ||
          (product.category && applied.categories.includes(product.category))
        )
      ) {
        return false;
      }
      if (
        applied.productTypes.length > 0 &&
        (!product.productType ||
          !applied.productTypes.includes(product.productType))
      ) {
        return false;
      }
      if (
        applied.collections.length > 0 &&
        (!product.collectionName ||
          !applied.collections.includes(product.collectionName))
      ) {
        return false;
      }
      if (
        applied.sizes.length > 0 &&
        !product.sizes.some(
          (size) => size.available && applied.sizes.includes(size.label),
        )
      ) {
        return false;
      }
      return (
        product.price >= applied.minPrice && product.price <= applied.maxPrice
      );
    });

    if (applied.sort === "price-low") {
      return filtered.sort((a, b) => a.price - b.price);
    }
    if (applied.sort === "price-high") {
      return filtered.sort((a, b) => b.price - a.price);
    }
    return filtered;
  }, [applied, products]);

  const pageCount = Math.max(1, Math.ceil(filteredProducts.length / pageSize));
  const safePage = Math.min(currentPage, pageCount);
  const visibleProducts = filteredProducts.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );
  const activeFilterCount =
    draft.categories.length +
    draft.productTypes.length +
    draft.collections.length +
    draft.sizes.length +
    (draft.minPrice !== priceMin || draft.maxPrice !== priceMax ? 1 : 0);

  function openDrawer() {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    setDraft({ ...applied });
    setMounted(true);
    requestAnimationFrame(() => setOpen(true));
  }

  function closeDrawer() {
    setOpen(false);
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    closeTimer.current = window.setTimeout(
      () => setMounted(false),
      reducedMotion ? 0 : 480,
    );
  }

  function applyFilters() {
    setApplied({ ...draft });
    setCurrentPage(1);
    router.replace("/products", { scroll: false });
    closeDrawer();
  }

  function toggleExpanded(name: string) {
    setExpanded((sections) =>
      sections.includes(name)
        ? sections.filter((section) => section !== name)
        : [...sections, name],
    );
  }

  function changeRange(field: "minPrice" | "maxPrice", value: number) {
    setDraft((current) =>
      field === "minPrice"
        ? { ...current, minPrice: Math.min(value, current.maxPrice) }
        : { ...current, maxPrice: Math.max(value, current.minPrice) },
    );
  }

  function renderChoices(
    options: FilterOption[],
    selected: string[],
    update: (value: string) => void,
  ) {
    if (options.length === 0) {
      return (
        <p className="py-3 text-sm text-black/55">
          No options are currently available.
        </p>
      );
    }

    return (
      <ul className="flex flex-col gap-3 py-4">
        {options.map((option) => (
          <li key={option.value}>
            <label className="flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={selected.includes(option.value)}
                onChange={() => update(option.value)}
                className="size-4 accent-[#0038b7]"
              />
              {option.label}
            </label>
          </li>
        ))}
      </ul>
    );
  }

  function section(
    title: string,
    options: FilterOption[],
    selected: string[],
    update: (value: string) => void,
  ) {
    const isExpanded = expanded.includes(title);
    const id = `mobile-filter-${title.toLowerCase().replaceAll(" ", "-")}`;

    return (
      <section className="border-b border-black/10" key={title}>
        <button
          type="button"
          aria-expanded={isExpanded}
          aria-controls={id}
          onClick={() => toggleExpanded(title)}
          className="flex min-h-[76px] w-full items-center justify-between px-6 text-left text-sm font-medium"
        >
          <span>{title}</span>
          <span
            aria-hidden="true"
            className={`text-xl font-light transition-transform duration-200 motion-reduce:transition-none ${
              isExpanded ? "rotate-45" : ""
            }`}
          >
            +
          </span>
        </button>
        <div
          id={id}
          inert={!isExpanded}
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
            isExpanded
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden px-6">
            {renderChoices(options, selected, update)}
          </div>
        </div>
      </section>
    );
  }

  return (
    <>
      <div className="md:hidden">
        <button
          type="button"
          onClick={openDrawer}
          className="flex items-center gap-2.5 text-body-4 uppercase"
        >
          Filters &amp; sort
          <SlidersHorizontal size={14} aria-hidden />
        </button>

        <ul className="mt-6 grid grid-cols-2 gap-x-3 gap-y-8">
          {visibleProducts.map((product) => (
            <li key={product.id}>
              <ProductCard product={product} variant="listing" />
            </li>
          ))}
        </ul>
        {visibleProducts.length === 0 && (
          <p className="py-16 text-center text-sm text-black/60">
            No products match these filters.
          </p>
        )}
        <Pagination
          page={safePage}
          pageCount={pageCount}
          hrefFor={(nextPage) =>
            (nextPage === 1 ? "/products" : `/products?page=${nextPage}`) as
              "/products" | `/products?page=${number}`
          }
          className="mt-16"
        />
      </div>

      {mounted && (
        <div className="fixed inset-0 z-[90] md:hidden">
          <button
            type="button"
            aria-label="Close filters"
            tabIndex={-1}
            onClick={closeDrawer}
            className={`absolute inset-0 bg-black/40 transition-opacity duration-[350ms] ease-out motion-reduce:transition-none ${
              open ? "opacity-100" : "opacity-0"
            }`}
          />
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Filters and sorting"
            aria-hidden={!open}
            inert={!open}
            className={`absolute inset-0 flex h-dvh flex-col bg-white text-black transition-transform duration-[450ms] ease-out motion-reduce:transition-none ${
              open ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <header className="flex h-[88px] shrink-0 items-center justify-between border-b border-black/10 px-6">
              <h2 className="text-xl font-semibold uppercase">
                Filters and sorting
              </h2>
              <button
                type="button"
                aria-label="Close filters"
                onClick={closeDrawer}
                className="flex size-10 items-center justify-center"
              >
                <X size={25} strokeWidth={1.5} />
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <section className="border-b border-black/10">
                <button
                  type="button"
                  aria-expanded={expanded.includes("Sort by")}
                  aria-controls="mobile-filter-sort-by"
                  onClick={() => toggleExpanded("Sort by")}
                  className="flex min-h-[76px] w-full items-center justify-between px-6 text-left text-sm font-medium"
                >
                  <span>SORT BY</span>
                  <span className="flex items-center gap-4 text-sm font-normal text-black/45 uppercase">
                    {
                      sortOptions.find((option) => option.value === draft.sort)
                        ?.label
                    }
                    <span aria-hidden="true" className="text-xl text-black">
                      {expanded.includes("Sort by") ? "−" : "+"}
                    </span>
                  </span>
                </button>
                <div
                  id="mobile-filter-sort-by"
                  inert={!expanded.includes("Sort by")}
                  className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
                    expanded.includes("Sort by")
                      ? "grid-rows-[1fr] opacity-100"
                      : "grid-rows-[0fr] opacity-0"
                  }`}
                >
                  <div className="overflow-hidden">
                    <ul className="flex flex-col gap-3 px-6 pb-5">
                      {sortOptions.map((option) => (
                        <li key={option.value}>
                          <label className="flex items-center gap-3 text-sm">
                            <input
                              type="radio"
                              name="mobile-sort"
                              value={option.value}
                              checked={draft.sort === option.value}
                              onChange={() =>
                                setDraft((current) => ({
                                  ...current,
                                  sort: option.value,
                                }))
                              }
                              className="size-4 accent-[#0038b7]"
                            />
                            {option.label}
                          </label>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </section>

              {section("CATEGORY", categoryChoices, draft.categories, (value) =>
                setDraft((current) => ({
                  ...current,
                  categories: toggleValue(current.categories, value),
                })),
              )}
              {section(
                "PRODUCT TYPE",
                productTypeChoices,
                draft.productTypes,
                (value) =>
                  setDraft((current) => ({
                    ...current,
                    productTypes: toggleValue(current.productTypes, value),
                  })),
              )}
              {section(
                "COLLECTION",
                collectionChoices,
                draft.collections,
                (value) =>
                  setDraft((current) => ({
                    ...current,
                    collections: toggleValue(current.collections, value),
                  })),
              )}
              {section("SIZE", sizeChoices, draft.sizes, (value) =>
                setDraft((current) => ({
                  ...current,
                  sizes: toggleValue(current.sizes, value),
                })),
              )}

              <section className="border-b border-black/10 px-6 pb-7">
                <h3 className="flex min-h-[76px] items-center text-sm font-medium">
                  PRICE
                </h3>
                <div className="relative mx-1 h-7">
                  <div className="absolute top-3 left-0 h-[3px] w-full bg-black/15" />
                  <div
                    className="absolute top-3 h-[3px] bg-[#0038b7]"
                    style={{
                      left: `${((draft.minPrice - priceMin) / Math.max(1, priceMax - priceMin)) * 100}%`,
                      right: `${100 - ((draft.maxPrice - priceMin) / Math.max(1, priceMax - priceMin)) * 100}%`,
                    }}
                  />
                  <input
                    aria-label="Minimum price"
                    type="range"
                    min={priceMin}
                    max={priceMax}
                    step={100}
                    value={draft.minPrice}
                    onChange={(event) =>
                      changeRange("minPrice", Number(event.target.value))
                    }
                    className="pointer-events-none absolute inset-0 h-7 w-full appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[#0038b7] [&::-moz-range-thumb]:bg-white [&::-webkit-slider-runnable-track]:h-7 [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#0038b7] [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-none"
                  />
                  <input
                    aria-label="Maximum price"
                    type="range"
                    min={priceMin}
                    max={priceMax}
                    step={100}
                    value={draft.maxPrice}
                    onChange={(event) =>
                      changeRange("maxPrice", Number(event.target.value))
                    }
                    className="pointer-events-none absolute inset-0 h-7 w-full appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-[#0038b7] [&::-moz-range-thumb]:bg-white [&::-webkit-slider-runnable-track]:h-7 [&::-webkit-slider-runnable-track]:bg-transparent [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-[#0038b7] [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-none"
                  />
                </div>
                <div className="mt-3 flex justify-between text-sm">
                  <span>
                    {formatPriceCompact(draft.minPrice / 10, "USD", "en-US")}
                  </span>
                  <span>
                    {formatPriceCompact(draft.maxPrice / 10, "USD", "en-US")}
                  </span>
                </div>
              </section>
            </div>

            <button
              type="button"
              onClick={applyFilters}
              className="flex h-[86px] shrink-0 items-center justify-between bg-[#063bb8] px-6 pb-[env(safe-area-inset-bottom)] text-left text-sm font-semibold text-white"
            >
              <span>APPLY FILTER</span>
              <span>({activeFilterCount})</span>
            </button>
          </section>
        </div>
      )}
    </>
  );
}
