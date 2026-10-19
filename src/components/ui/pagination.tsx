import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { cn } from "@/lib/utils";

type PaginationProps = {
  page: number;
  pageCount: number;
  /** Builds the link for a page number. */
  hrefFor: (page: number) => Route;
  className?: string;
};

type Item = number | "ellipsis-start" | "ellipsis-end";

/** 1 2 3 … 10: a window of three pages around the current one, plus first and last. */
function getItems(page: number, pageCount: number): Item[] {
  if (pageCount <= 5) return Array.from({ length: pageCount }, (_, i) => i + 1);

  const start = Math.max(1, Math.min(page - 1, pageCount - 2));
  const items: Item[] = [];
  if (start > 1) {
    items.push(1);
    if (start > 2) items.push("ellipsis-start");
  }
  for (let n = start; n < start + 3; n++) items.push(n);
  if (start + 2 < pageCount) {
    if (start + 2 < pageCount - 1) items.push("ellipsis-end");
    items.push(pageCount);
  }
  return items;
}

const item = "flex size-6 items-center justify-center text-body-3";

export function Pagination({
  page,
  pageCount,
  hrefFor,
  className,
}: PaginationProps) {
  if (pageCount <= 1) return null;

  return (
    <nav
      aria-label="Pagination"
      className={cn("flex items-center justify-center gap-2", className)}
    >
      {page > 1 ? (
        <Link
          href={hrefFor(page - 1)}
          aria-label="Previous page"
          className={cn(item, "text-black")}
        >
          <ChevronLeft size={14} aria-hidden />
        </Link>
      ) : (
        <span aria-hidden className={cn(item, "text-muted")}>
          <ChevronLeft size={14} />
        </span>
      )}

      {getItems(page, pageCount).map((entry) =>
        typeof entry === "string" ? (
          <span key={entry} aria-hidden className={cn(item, "text-muted")}>
            …
          </span>
        ) : entry === page ? (
          <span
            key={entry}
            aria-current="page"
            className={cn(item, "font-semibold text-black")}
          >
            {entry}
          </span>
        ) : (
          <Link
            key={entry}
            href={hrefFor(entry)}
            aria-label={`Page ${entry}`}
            className={cn(item, "text-muted hover:text-black")}
          >
            {entry}
          </Link>
        ),
      )}

      {page < pageCount ? (
        <Link
          href={hrefFor(page + 1)}
          aria-label="Next page"
          className={cn(item, "text-black")}
        >
          <ChevronRight size={14} aria-hidden />
        </Link>
      ) : (
        <span aria-hidden className={cn(item, "text-muted")}>
          <ChevronRight size={14} />
        </span>
      )}
    </nav>
  );
}
