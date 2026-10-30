"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import type { ProductColor, ProductSize } from "../types";

/* Colour and size pickers shared by the product page and wishlist cards. */

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";
const label = "text-body-4 text-muted uppercase";

type Density = "regular" | "compact";

export function ColorPicker({
  colors,
  value,
  onChange,
  density = "regular",
}: {
  colors: ProductColor[];
  /** Index of the selected colour. */
  value: number;
  onChange: (index: number) => void;
  density?: Density;
}) {
  if (colors.length === 0) return null;
  const compact = density === "compact";
  // Photo tiles when any colour has a photo; colours without one keep their
  // swatch, at the same tile size.
  const photos = colors.some((c) => c.image);
  return (
    <div className={cn("flex flex-col", compact ? "gap-2" : "gap-3")}>
      <p className={label}>Color: {colors[value]?.name}</p>
      <div
        role="radiogroup"
        aria-label="Color"
        className={cn("flex flex-wrap", photos && !compact ? "gap-3" : "gap-2")}
      >
        {colors.map((color, i) => (
          <button
            key={color.name}
            type="button"
            role="radio"
            aria-checked={i === value}
            aria-label={color.name}
            onClick={() => onChange(i)}
            className={cn(
              "relative flex items-center justify-center overflow-hidden border bg-card",
              compact ? "size-9" : photos ? "size-14" : "size-11",
              i === value ? "border-black" : "border-transparent",
              focusRing,
            )}
          >
            {color.image ? (
              <Image
                src={color.image}
                alt=""
                fill
                sizes={compact ? "36px" : "56px"}
                className="object-contain p-1"
              />
            ) : (
              <span
                aria-hidden
                className={cn(
                  "rounded-t-sm",
                  compact ? "h-5 w-4" : photos ? "h-7 w-6" : "h-6 w-5",
                )}
                style={{ backgroundColor: color.swatch }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SizePicker({
  sizes,
  value,
  onChange,
  density = "regular",
  selectedClassName = "border-primary",
  children,
}: {
  sizes: ProductSize[];
  value: string | null;
  onChange: (size: string) => void;
  density?: Density;
  /** Border colour of the chosen size (blue on the product page). */
  selectedClassName?: string;
  /** Extra controls after the sizes, e.g. the size guide link. */
  children?: React.ReactNode;
}) {
  if (sizes.length === 0) return null;
  const compact = density === "compact";
  return (
    <div className={cn("flex flex-col", compact ? "gap-2" : "gap-3")}>
      <p className={label}>Choose size</p>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div
          role="radiogroup"
          aria-label="Size"
          className={cn("flex items-center", compact ? "gap-1" : "gap-3")}
        >
          {sizes.map((s) => (
            <button
              key={s.label}
              type="button"
              role="radio"
              aria-checked={s.label === value}
              disabled={!s.available}
              onClick={() => onChange(s.label)}
              className={cn(
                "flex items-center justify-center border",
                compact
                  ? "h-8 min-w-8 px-1.5 text-body-3"
                  : "h-9 min-w-9 px-2 text-body-2",
                s.label === value ? selectedClassName : "border-transparent",
                !s.available && "text-muted line-through",
                focusRing,
              )}
            >
              {s.label}
              {!s.available && <span className="sr-only"> (sold out)</span>}
            </button>
          ))}
        </div>
        {children}
      </div>
    </div>
  );
}

/** First size that isn't sold out, the sensible default selection. */
export const firstAvailableSize = (sizes: ProductSize[]) =>
  sizes.find((s) => s.available)?.label ?? null;
