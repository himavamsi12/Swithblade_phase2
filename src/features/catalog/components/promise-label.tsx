import type { CSSProperties } from "react";
import Link from "next/link";
import starBadge from "@/assets/images/product-logo.png";
import { cn } from "@/lib/utils";

/**
 * Product page label for promise pieces: the brand star in blue on a white
 * tile and "Switchblade Promises", in a primary-blue bar that links to the
 * Promises page. The star's PNG is used as a mask so it takes the primary
 * colour exactly.
 */
export function PromiseLabel({ className }: { className?: string }) {
  return (
    <Link
      href="/promises"
      aria-label="Switchblade Promises"
      className={cn(
        "inline-flex h-[47px] items-center rounded-[10px] bg-primary p-[5px] text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
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
      <span className="px-5 text-[14px] leading-none font-bold tracking-[0.1em] whitespace-nowrap uppercase sm:px-8 sm:text-[16px]">
        Switchblade Promises
      </span>
    </Link>
  );
}
