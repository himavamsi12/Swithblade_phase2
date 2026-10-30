import type { CSSProperties } from "react";
import starBadge from "@/assets/images/product-logo.png";
import { cn } from "@/lib/utils";

/**
 * The brand star (blue product mark) with a light sweep across it; the star
 * itself stays its size. Pure CSS (see `.star-badge` in globals.css), so no
 * JavaScript ships for it, and it holds still for people who prefer reduced
 * motion.
 */
export function StarBadge({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("star-badge", className)}
      style={{ "--star-badge": `url(${starBadge.src})` } as CSSProperties}
    >
      <span className="star-badge__shape" />
    </span>
  );
}
