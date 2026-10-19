"use client";

import Form from "next/form";
import Link from "next/link";
import { Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";
import { searchHref } from "../search-href";

type HeaderSearchProps = {
  /** The header's search icon. */
  icon: React.ReactNode;
  className?: string;
};

/**
 * The header's search button and the panel it opens: a full-width bar under
 * the header with suggested categories, over a dimmed page. Must sit inside a
 * positioned header, since the panel hangs off its bottom edge. While open,
 * the panel carries `data-search-open`, so the header can restyle itself
 * with `:has()`.
 *
 * The panel stays mounted so it can animate both ways: it wipes down from
 * the header with `clip-path` (no layout work per frame) and is `inert` and
 * `invisible` while closed, so it's out of the tab order and screen readers.
 */
export function HeaderSearch({ icon, className }: HeaderSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const button = useRef<HTMLButtonElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const panelId = useId();

  // The query is cleared on open rather than close, so the suggestions don't
  // jump while the panel slides away.
  const openPanel = () => {
    setQuery("");
    setOpen(true);
  };
  const close = () => setOpen(false);

  useEffect(() => {
    if (!open) return;
    // After the panel becomes visible (it's `invisible` while closed).
    const frame = requestAnimationFrame(() =>
      input.current?.focus({ preventScroll: true }),
    );
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      button.current?.focus();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const term = query.trim().toLowerCase();
  const suggestions = siteConfig.searchSuggestions.filter((s) =>
    s.toLowerCase().includes(term),
  );

  return (
    <>
      <button
        ref={button}
        type="button"
        aria-label="Search"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={open ? close : openPanel}
        className={className}
      >
        {icon}
      </button>

      {/* Dims the page below the header; the header isn't sticky, so it's
          always at the top of the screen when the panel is open. */}
      <div
        aria-hidden
        onClick={close}
        className={cn(
          "absolute inset-x-0 top-full h-dvh bg-black/35 transition-opacity duration-300 motion-reduce:transition-none",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <div
        id={panelId}
        role="dialog"
        aria-label="Search"
        data-search-open={open || undefined}
        inert={!open}
        className={cn(
          "absolute inset-x-0 top-full bg-white text-black shadow-[0_12px_24px_rgb(0_0_0/0.06)] motion-reduce:transition-none",
          open
            ? // Negative bottom inset leaves room for the shadow.
              // Visible at once when opening (so the input can take focus);
              // hidden only after the wipe when closing.
              "visible transition-[clip-path] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] [clip-path:inset(0_0_-2rem_0)]"
            : "invisible transition-[clip-path,visibility] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] [clip-path:inset(0_0_100%_0)]",
        )}
      >
        <Form
          action="/search"
          onSubmit={close}
          role="search"
          className="flex h-18 items-center gap-4 border-b border-stroke px-4 md:h-24 md:px-14"
        >
          <Search
            size={22}
            strokeWidth={1.25}
            aria-hidden
            className="shrink-0"
          />
          <span aria-hidden className="h-4 w-px shrink-0 bg-stroke" />
          <label htmlFor={`${panelId}-input`} className="sr-only">
            Search for products and categories
          </label>
          <input
            id={`${panelId}-input`}
            name="q"
            type="search"
            ref={input}
            autoComplete="off"
            required
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for product, categories..."
            className="min-w-0 flex-1 bg-transparent text-body-2 outline-none placeholder:text-muted [&::-webkit-search-cancel-button]:hidden"
          />
          <button
            type="button"
            aria-label="Close search"
            onClick={() => {
              close();
              button.current?.focus();
            }}
            className="shrink-0 transition-opacity hover:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current"
          >
            <X size={22} strokeWidth={1.25} aria-hidden />
          </button>
        </Form>

        {suggestions.length > 0 && (
          <ul
            aria-label="Suggested categories"
            className="flex flex-col gap-5 px-4 py-6 md:px-14 md:py-7"
          >
            {suggestions.map((label, i) => (
              <li
                key={label}
                // Drift in one after another behind the panel's wipe.
                style={{
                  transitionDelay: open ? `${120 + i * 50}ms` : "0ms",
                }}
                className={cn(
                  "transition-[opacity,translate] duration-400 ease-out motion-reduce:transition-none",
                  open
                    ? "translate-y-0 opacity-100"
                    : "-translate-y-2 opacity-0",
                )}
              >
                <Link
                  href={searchHref(label)}
                  onClick={close}
                  className="text-body-1 font-semibold uppercase transition-opacity hover:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
