import type { CSSProperties } from "react";
import Link from "next/link";
import starBadge from "@/assets/images/product-logo.png";
import { cn } from "@/lib/utils";

/**
 * Product page label for promise pieces: the brand star in blue on a white
 * tile, set in a primary-blue bar that links to the Promises page.
 * "Switchblade Promises" slides out on hover or focus, and is always shown on
 * touch screens, which have no hover. The star's PNG is used as a mask so it
 * takes the primary colour exactly.
 */
export function PromiseLabel({ className }: { className?: string }) {
  return (
    <Link
      href="/promises"
      aria-label="Switchblade Promises"
      className={cn(
        "group inline-flex h-[47px] items-center rounded-[10px] bg-primary p-[5px] text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        className,
      )}
    >
      <span className="flex size-[37px] shrink-0 items-center justify-center rounded-[6px] bg-white">
        <span
          aria-hidden
          className="block h-[24px] w-[16px] bg-primary [mask:var(--star-badge)_center/contain_no-repeat]"
          style={{ "--star-badge": `url(${starBadge.src})` } as CSSProperties}
        />
      </span>
      {/* Width animates 0fr → 1fr, so the bar grows to fit the text. */}
      <span className="grid grid-cols-[0fr] transition-[grid-template-columns] duration-300 ease-out group-hover:grid-cols-[1fr] group-focus-visible:grid-cols-[1fr] motion-reduce:transition-none pointer-coarse:grid-cols-[1fr]">
        <span className="overflow-hidden">
          <span className="block pr-4 pl-4 text-[14px] leading-none font-bold tracking-[0.1em] whitespace-nowrap uppercase">
            Switchblade Promises
          </span>
        </span>
      </span>
    </Link>
  );
}
