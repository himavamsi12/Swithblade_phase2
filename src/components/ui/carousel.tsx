"use client";

import Image from "next/image";
import { Children, useCallback, useEffect, useRef, useState } from "react";
import chevron from "@/assets/icons/carousel/chevron.svg";
import chevronMuted from "@/assets/icons/carousel/chevron-muted.svg";
import { cn } from "@/lib/utils";

type CarouselProps = {
  title: string;
  children: React.ReactNode;
  className?: string;
  /** Classes for the scrolling row; set the gap here. */
  trackClassName?: string;
  /** Classes for each item; set the responsive width (`basis-*`) here. */
  itemClassName?: string;
};

const DEFAULT_TRACK = "gap-3";
const DEFAULT_ITEM =
  "shrink-0 basis-[calc((100%-12px)/2)] snap-start md:basis-[calc((100%-24px)/3)] lg:basis-[calc((100%-48px)/5)]";

/** Titled, scroll-snapping row with previous/next arrows. */
export function Carousel({
  title,
  children,
  className,
  trackClassName = DEFAULT_TRACK,
  itemClassName = DEFAULT_ITEM,
}: CarouselProps) {
  const trackRef = useRef<HTMLUListElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const update = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 1);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, [update]);

  function scrollByItem(direction: -1 | 1) {
    const el = trackRef.current;
    const item = el?.firstElementChild;
    if (!el || !item) return;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    el.scrollBy({
      left: direction * (item.getBoundingClientRect().width + gap),
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }

  const arrow =
    "flex size-5 items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-default";

  return (
    <section
      aria-label={title}
      className={cn("flex flex-col gap-[42px]", className)}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-[24px] leading-9 font-semibold uppercase">
          {title}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous"
            disabled={!canPrev}
            onClick={() => scrollByItem(-1)}
            className={arrow}
          >
            <Image
              src={canPrev ? chevron : chevronMuted}
              alt=""
              className="-rotate-90"
            />
          </button>
          <button
            type="button"
            aria-label="Next"
            disabled={!canNext}
            onClick={() => scrollByItem(1)}
            className={arrow}
          >
            <Image
              src={canNext ? chevron : chevronMuted}
              alt=""
              className="rotate-90"
            />
          </button>
        </div>
      </div>

      <ul
        ref={trackRef}
        className={cn(
          "flex snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto [&::-webkit-scrollbar]:hidden",
          trackClassName,
        )}
      >
        {Children.toArray(children).map((child, i) => (
          <li key={i} className={itemClassName}>
            {child}
          </li>
        ))}
      </ul>
    </section>
  );
}
