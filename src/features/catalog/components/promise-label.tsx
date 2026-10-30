import type { CSSProperties } from "react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import starBadge from "@/assets/images/product-logo.png";
import { cn } from "@/lib/utils";

/**
 * Product page label for promise pieces: the brand star in white on a
 * primary-blue bar, linking to the Promises page. "Switchblade Promises"
 * slides out on hover or focus, and is always shown on touch screens, which
 * have no hover. The star's PNG is used as a mask so it can be recoloured.
 */
export function PromiseLabel({ className }: { className?: string }) {
  return (
    <Link
      href="/promises"
      className={cn(
        "group inline-flex h-[47px] items-center rounded-[4px] bg-primary text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        className,
      )}
    >
      <span className="flex size-[47px] shrink-0 items-center justify-center">
        <span
          aria-hidden
          className="block h-[26px] w-[17px] bg-white [mask:var(--star-badge)_center/contain_no-repeat]"
          style={{ "--star-badge": `url(${starBadge.src})` } as CSSProperties}
        />
      </span>
      {/* Width animates 0fr → 1fr, so the bar grows to fit the text. */}
      <span className="grid grid-cols-[0fr] transition-[grid-template-columns] duration-300 ease-out group-hover:grid-cols-[1fr] group-focus-visible:grid-cols-[1fr] motion-reduce:transition-none pointer-coarse:grid-cols-[1fr]">
        <span className="overflow-hidden">
          <span className="flex items-center gap-2 pr-4 text-body-4 tracking-[0.1em] whitespace-nowrap uppercase">
            Switchblade Promises
            <ArrowRight size={14} strokeWidth={1.5} aria-hidden />
          </span>
        </span>
      </span>
    </Link>
  );
}
