import type { CSSProperties } from "react";
import starBadge from "@/assets/images/product-logo.png";
import { cn } from "@/lib/utils";

/**
 * Product page label for promise pieces: the brand star in white on a
 * primary-blue tile. The star's PNG is used as a mask so it can be recoloured.
 */
export function PromiseLabel({ className }: { className?: string }) {
  return (
    <span
      role="img"
      aria-label="Promise piece"
      title="Promise piece"
      className={cn(
        "flex size-[47px] items-center justify-center rounded-[4px] bg-primary",
        className,
      )}
    >
      <span
        className="block h-[26px] w-[17px] bg-white [mask:var(--star-badge)_center/contain_no-repeat]"
        style={{ "--star-badge": `url(${starBadge.src})` } as CSSProperties}
      />
    </span>
  );
}
