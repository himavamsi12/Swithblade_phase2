"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import Image from "next/image";
import {
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type TouchEvent,
} from "react";
import { cn } from "@/lib/utils";

type ProductGalleryProps = {
  images: string[];
  name: string;
};

const focusRing =
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

/** Swipes shorter than this (px) are treated as taps. */
const SWIPE_THRESHOLD = 50;

/**
 * Two-column grid of product photos. Clicking a photo opens it full screen
 * with previous/next controls, thumbnails, arrow keys and swipe. Uses the
 * native <dialog>, so Escape and focus handling come from the browser, and
 * full-size images only load once the viewer is open.
 */
export function ProductGallery({ images, name }: ProductGalleryProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const touchStartX = useRef<number | null>(null);
  const [index, setIndex] = useState(0);
  // The photo sliding out while the new one slides in; null when idle.
  const [outgoing, setOutgoing] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const cursorRef = useRef<HTMLSpanElement>(null);
  const [hoverSide, setHoverSide] = useState<"prev" | "next" | null>(null);

  const count = images.length;
  const currentIndex = Math.max(0, Math.min(index, count - 1));
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < count - 1;
  const alt = (i: number) => `${name}, photo ${i + 1} of ${count}`;

  const open = (i: number) => {
    setIndex(i);
    setOutgoing(null);
    setIsOpen(true);
    dialogRef.current?.showModal();
  };
  const close = () => dialogRef.current?.close();
  const show = (i: number) => {
    if (i === currentIndex || i < 0 || i >= count) return;
    setOutgoing(currentIndex);
    setIndex(i);
  };
  const go = (delta: number) => show(currentIndex + delta);

  // The "[ PREV ]" / "[ NEXT ]" label follows the mouse. Its position is
  // written straight to the DOM so moving the mouse never re-renders.
  const moveCursor = (e: MouseEvent) => {
    const el = cursorRef.current;
    if (el) {
      el.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0) translate(-50%, -50%)`;
    }
  };
  const cursorLabel =
    hoverSide === "prev" && hasPrev
      ? "[ Prev ]"
      : hoverSide === "next" && hasNext
        ? "[ Next ]"
        : null;

  const onKeyDown = (e: KeyboardEvent<HTMLDialogElement>) => {
    if (e.key === "ArrowRight") go(1);
    if (e.key === "ArrowLeft") go(-1);
  };
  const onTouchStart = (e: TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: TouchEvent) => {
    const start = touchStartX.current;
    const end = e.changedTouches[0]?.clientX;
    touchStartX.current = null;
    if (start === null || end === undefined) return;
    const dx = end - start;
    if (Math.abs(dx) >= SWIPE_THRESHOLD) go(dx < 0 ? 1 : -1);
  };

  if (count === 0) return null;

  return (
    <>
      <div className="md:hidden">
        <div
          className="relative aspect-[0.593] overflow-hidden bg-[#f2f2f2]"
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          <Image
            src={images[currentIndex]!}
            alt={alt(currentIndex)}
            fill
            sizes="(min-width: 768px) 35vw, calc(100vw - 2rem)"
            priority
            className="object-contain"
          />

          {count > 1 && (
            <>
              <div className="absolute inset-x-0 bottom-[88px] flex justify-center gap-2">
                <button
                  type="button"
                  onClick={() => go(-1)}
                  disabled={!hasPrev}
                  aria-label="Previous photo"
                  className={cn(
                    "flex size-14 items-center justify-center rounded-full bg-white text-black disabled:opacity-45",
                    focusRing,
                  )}
                >
                  <ChevronLeft size={22} strokeWidth={1.5} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => go(1)}
                  disabled={!hasNext}
                  aria-label="Next photo"
                  className={cn(
                    "flex size-14 items-center justify-center rounded-full bg-white text-black disabled:opacity-45",
                    focusRing,
                  )}
                >
                  <ChevronRight size={22} strokeWidth={1.5} aria-hidden />
                </button>
              </div>
              <ul
                className="absolute inset-x-0 bottom-[42px] flex items-center justify-center gap-2"
                aria-label="Product image pagination"
              >
                {images.map((src, i) => (
                  <li key={`${src}-${i}`}>
                    <button
                      type="button"
                      onClick={() => show(i)}
                      aria-label={`Show photo ${i + 1}`}
                      aria-current={i === currentIndex}
                      className={cn(
                        "block h-2 rounded-full bg-white transition-[width,opacity]",
                        i === currentIndex
                          ? "w-7 opacity-100"
                          : "size-2 opacity-50",
                        focusRing,
                      )}
                    />
                  </li>
                ))}
              </ul>
              <p className="sr-only" aria-live="polite">
                Photo {currentIndex + 1} of {count}
              </p>
            </>
          )}
        </div>

        <div className="mt-3 flex items-center gap-2">
          {images.slice(0, 4).map((src, i) => (
            <button
              key={`${src}-${i}`}
              type="button"
              onClick={() => show(i)}
              aria-label={`Show photo ${i + 1}`}
              aria-current={i === currentIndex}
              className={cn(
                "relative aspect-[4/5] min-w-0 flex-1 overflow-hidden bg-card",
                focusRing,
              )}
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="20vw"
                className={cn(
                  "object-cover",
                  i !== currentIndex && "opacity-70",
                )}
              />
              <span
                aria-hidden="true"
                className={cn(
                  "absolute inset-0",
                  i === currentIndex
                    ? "border-2 border-black"
                    : "border border-stroke",
                )}
              />
            </button>
          ))}
          {count > 4 && (
            <button
              type="button"
              onClick={() => show(4)}
              aria-label={`Show ${count - 4} more photos`}
              className={cn(
                "shrink-0 text-base font-medium uppercase",
                focusRing,
              )}
            >
              +{count - 4} MORE
            </button>
          )}
        </div>
      </div>

      <ul className="hidden grid-cols-2 gap-2.5 md:grid">
        {images.map((src, i) => (
          <li key={src} className="bg-card">
            <button
              type="button"
              onClick={() => open(i)}
              aria-label={`View ${alt(i)} full screen`}
              className={cn("block w-full cursor-zoom-in", focusRing)}
            >
              <Image
                src={src}
                alt={alt(i)}
                width={699}
                height={930}
                sizes="(min-width: 1024px) 35vw, 50vw"
                priority={i < 2}
                className="h-auto w-full"
              />
            </button>
          </li>
        ))}
      </ul>

      <dialog
        ref={dialogRef}
        aria-label={`${name} photos`}
        onClose={() => setIsOpen(false)}
        onKeyDown={onKeyDown}
        className="m-0 h-dvh max-h-none w-screen max-w-none overflow-hidden bg-card p-0 outline-none backdrop:bg-card"
      >
        {isOpen && (
          <div
            className="relative size-full"
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            {/* Photo change: the new photo slides down into view while the old
                one slides down and out. */}
            <div
              key={`in-${currentIndex}`}
              className={cn(
                "absolute inset-0",
                outgoing !== null && "animate-lightbox-in",
              )}
            >
              <Image
                src={images[currentIndex]!}
                alt={alt(currentIndex)}
                fill
                sizes="100vw"
                quality={90}
                className="object-contain"
              />
            </div>
            {outgoing !== null && (
              <div
                key={`out-${outgoing}-${currentIndex}`}
                aria-hidden
                className="absolute inset-0 animate-lightbox-out"
                onAnimationEnd={() => setOutgoing(null)}
              >
                <Image
                  src={images[outgoing]!}
                  alt=""
                  fill
                  sizes="100vw"
                  quality={90}
                  className="object-contain"
                />
              </div>
            )}
            {/* Warm the neighbours so the next slide never starts blank. */}
            {[currentIndex - 1, currentIndex + 1]
              .filter((i) => i >= 0 && i < count)
              .map((i) => (
                <Image
                  key={`preload-${i}`}
                  src={images[i]!}
                  alt=""
                  aria-hidden
                  fill
                  sizes="100vw"
                  quality={90}
                  className="invisible"
                />
              ))}

            {/* Mouse zones: left half goes back, right half goes forward. */}
            {(["prev", "next"] as const).map((side) =>
              (side === "prev" ? hasPrev : hasNext) ? (
                <div
                  key={side}
                  aria-hidden
                  onClick={() => go(side === "prev" ? -1 : 1)}
                  onMouseEnter={(e) => {
                    moveCursor(e);
                    setHoverSide(side);
                  }}
                  onMouseMove={moveCursor}
                  onMouseLeave={() => setHoverSide(null)}
                  className={cn(
                    "absolute inset-y-0 w-1/2 cursor-pointer pointer-fine:cursor-none",
                    side === "prev" ? "left-0" : "right-0",
                  )}
                />
              ) : null,
            )}
            <span
              ref={cursorRef}
              aria-hidden
              className={cn(
                "pointer-events-none fixed top-0 left-0 z-20 hidden text-body-3 tracking-[0.2em] whitespace-nowrap text-black uppercase transition-opacity duration-150 md:text-body-2 pointer-fine:block",
                cursorLabel ? "opacity-100" : "opacity-0",
              )}
            >
              {cursorLabel}
            </span>

            <p className="sr-only" aria-live="polite">
              Photo {currentIndex + 1} of {count}
            </p>

            <button
              type="button"
              onClick={close}
              aria-label="Close full screen view"
              className={cn(
                "absolute top-4 right-4 flex size-11 items-center justify-center bg-white text-black transition-opacity hover:opacity-80 md:top-3.5 md:right-3.5 md:size-12",
                focusRing,
              )}
            >
              <X size={22} strokeWidth={1.5} aria-hidden />
            </button>

            {hasPrev && (
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label="Previous photo"
                className={cn(
                  "absolute top-1/2 left-2 -translate-y-1/2 px-2 py-4 text-body-4 tracking-[0.2em] text-black uppercase hover:opacity-60 md:left-4 md:text-body-3 pointer-fine:pointer-events-none pointer-fine:not-focus-visible:opacity-0",
                  focusRing,
                )}
              >
                [ Prev ]
              </button>
            )}
            {hasNext && (
              <button
                type="button"
                onClick={() => go(1)}
                aria-label="Next photo"
                className={cn(
                  "absolute top-1/2 right-2 -translate-y-1/2 px-2 py-4 text-body-4 tracking-[0.2em] text-black uppercase hover:opacity-60 md:right-4 md:text-body-3 pointer-fine:pointer-events-none pointer-fine:not-focus-visible:opacity-0",
                  focusRing,
                )}
              >
                [ Next ]
              </button>
            )}

            {count > 1 && (
              <ul className="absolute bottom-4 left-4 flex gap-1 md:bottom-3.5 md:left-4">
                {images.map((src, i) => (
                  <li key={src}>
                    <button
                      type="button"
                      onClick={() => show(i)}
                      aria-label={`Show photo ${i + 1}`}
                      aria-current={i === currentIndex}
                      className={cn(
                        "relative block h-[52px] w-[42px] overflow-hidden bg-card md:h-[70px] md:w-14",
                        i !== currentIndex && "opacity-70 hover:opacity-100",
                        focusRing,
                      )}
                    >
                      <Image
                        src={src}
                        alt=""
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                      {/* Border drawn above the photo. */}
                      <span
                        aria-hidden
                        className={cn(
                          "absolute inset-0",
                          i === currentIndex
                            ? "border-2 border-black"
                            : "border border-stroke",
                        )}
                      />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </dialog>
    </>
  );
}
