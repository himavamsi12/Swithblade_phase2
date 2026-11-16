"use client";

import { Check, ShoppingCartPlus, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { cartActions, openCart } from "@/features/cart/store";
import type { CartItemInput } from "@/features/cart/types";
import { cn } from "@/lib/utils";
import type { ProductSize } from "../types";

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/**
 * Blue add-to-bag square on product cards. Adds the default colour without
 * leaving the page. Products with sizes never get one picked for them: the
 * button opens a size panel over the photo, and choosing a size adds it.
 */
export function QuickAddButton({
  item,
  sizes,
  className,
}: {
  item: Omit<CartItemInput, "size">;
  sizes: ProductSize[];
  className?: string;
}) {
  const [added, setAdded] = useState(false);
  const [picking, setPicking] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const panelId = useId();
  const headingId = useId();
  const needsSize = sizes.length > 0;

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 1500);
    return () => clearTimeout(t);
  }, [added]);

  // Escape or a click outside closes the size panel.
  useEffect(() => {
    if (!picking) return;
    panel.current
      ?.querySelector<HTMLButtonElement>("[data-size]:not(:disabled)")
      ?.focus({ preventScroll: true });
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setPicking(false);
      button.current?.focus();
    };
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (panel.current?.contains(target) || button.current?.contains(target))
        return;
      setPicking(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [picking]);

  const add = (size: string | null) => {
    cartActions.add({ ...item, size });
    setPicking(false);
    setAdded(true);
    openCart();
  };

  return (
    <>
      <button
        ref={button}
        type="button"
        onClick={() => (needsSize ? setPicking((p) => !p) : add(null))}
        aria-label={
          needsSize
            ? `Choose a size to add ${item.name} to bag`
            : `Add ${item.name}${item.color ? ` (${item.color})` : ""} to bag`
        }
        aria-expanded={needsSize ? picking : undefined}
        aria-controls={needsSize ? panelId : undefined}
        className={cn(
          "flex size-11 items-center justify-center bg-primary text-white transition-[opacity,transform] duration-200 hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white active:scale-95 md:size-[52px]",
          className,
          picking && "opacity-100",
        )}
      >
        {added ? (
          <Check size={22} strokeWidth={1.75} aria-hidden />
        ) : (
          <ShoppingCartPlus size={22} strokeWidth={1.75} aria-hidden />
        )}
      </button>

      {/* Stays mounted so it can slide both ways; `inert` while closed. */}
      {needsSize && (
        <div
          ref={panel}
          id={panelId}
          role="group"
          aria-labelledby={headingId}
          inert={!picking}
          className={cn(
            "absolute inset-x-0 bottom-0 z-20 flex flex-col gap-2 bg-white p-3 text-black shadow-[0_-4px_16px_rgba(0,0,0,0.08)] motion-reduce:transition-none",
            picking
              ? "visible translate-y-0 opacity-100 transition-[translate,opacity] duration-400 ease-[cubic-bezier(0.22,1,0.36,1)]"
              : "invisible translate-y-full opacity-0 transition-[translate,opacity,visibility] duration-250 ease-[cubic-bezier(0.4,0,0.2,1)]",
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <p id={headingId} className="text-body-4 text-red-600 uppercase">
              Please select a size
            </p>
            <button
              type="button"
              onClick={() => {
                setPicking(false);
                button.current?.focus();
              }}
              aria-label="Close size picker"
              className={cn(
                "flex size-6 items-center justify-center hover:opacity-60",
                focusRing,
              )}
            >
              <X size={16} strokeWidth={1.5} aria-hidden />
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {sizes.map((s) => (
              <button
                key={s.label}
                type="button"
                data-size
                disabled={!s.available}
                onClick={() => add(s.label)}
                className={cn(
                  "flex h-8 min-w-8 items-center justify-center border border-stroke px-1.5 text-body-3 transition-colors hover:border-black",
                  !s.available && "text-muted line-through hover:border-stroke",
                  focusRing,
                )}
              >
                {s.label}
                {!s.available && <span className="sr-only"> (sold out)</span>}
              </button>
            ))}
          </div>
        </div>
      )}

      <span className="sr-only" aria-live="polite">
        {added ? `${item.name} added to your bag.` : ""}
      </span>
    </>
  );
}
