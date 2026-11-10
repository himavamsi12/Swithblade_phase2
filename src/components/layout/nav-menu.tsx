"use client";

import type { Route } from "next";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type NavMenuProps = {
  label: string;
  items: readonly { label: string; href: Route }[];
  /** Shared look of the header's top-level nav links. */
  className?: string;
};

/**
 * A header nav entry that opens a list of links below it on click, on a
 * see-through dark panel with white text, so the links stay readable over
 * photos on any page. Closes on Escape, an outside click, or following a link.
 */
export function NavMenu({ label, items, className }: NavMenuProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        className={cn(className, open && "opacity-60")}
      >
        {label}
      </button>

      <ul
        id={listId}
        // `invisible` (not `hidden`) so the list can fade out before it goes.
        className={cn(
          "absolute top-full -left-4 z-10 mt-3 flex min-w-56 flex-col gap-3 bg-black/55 px-4 pt-5 pb-6 text-white backdrop-blur-sm transition-[opacity,visibility] duration-300 motion-reduce:transition-none",
          !open && "invisible opacity-0",
        )}
      >
        {items.map((item, i) => (
          <li
            key={item.label}
            // Drift in one after another, like the search suggestions.
            style={{ transitionDelay: open ? `${i * 40}ms` : "0ms" }}
            className={cn(
              "transition-[opacity,translate] duration-300 ease-out motion-reduce:transition-none",
              open ? "translate-y-0 opacity-100" : "-translate-y-1 opacity-0",
            )}
          >
            <Link
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(className, "whitespace-nowrap")}
            >
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
