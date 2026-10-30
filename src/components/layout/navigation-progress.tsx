"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

/** Hide the bar regardless after this long, so it can never stick. */
const MAX_MS = 10_000;
/** Navigations quicker than this finish before the bar appears. */
const SHOW_AFTER_MS = 120;

/**
 * A thin bar across the top of the page while the next page loads, so a
 * click on a link never looks ignored. Starts on a click on a link to
 * another page of this site and finishes when the URL changes. Renders
 * nothing for quick (prefetched) navigations.
 */
export function NavigationProgress() {
  return (
    // useSearchParams needs a Suspense boundary to keep pages static.
    <Suspense fallback={null}>
      <Bar />
    </Suspense>
  );
}

type Phase = "idle" | "loading" | "done";

function Bar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const url = `${pathname}?${searchParams.toString()}`;
  const [phase, setPhase] = useState<Phase>("idle");
  const timers = useRef<number[]>([]);

  const clear = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };

  // A new URL means the page arrived: run the bar out, then hide it.
  const [lastUrl, setLastUrl] = useState(url);
  if (url !== lastUrl) {
    setLastUrl(url);
    if (phase === "loading") setPhase("done");
  }

  useEffect(() => {
    if (phase !== "done") return;
    clear();
    const t = window.setTimeout(() => setPhase("idle"), 300);
    return () => window.clearTimeout(t);
  }, [phase]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const link = (event.target as Element | null)?.closest("a");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) {
        return;
      }
      const next = new URL(link.href, window.location.href);
      if (next.origin !== window.location.origin) return;
      // Same page (or just a #section): nothing to load.
      if (
        next.pathname === window.location.pathname &&
        next.search === window.location.search
      ) {
        return;
      }
      clear();
      timers.current.push(
        window.setTimeout(() => setPhase("loading"), SHOW_AFTER_MS),
        window.setTimeout(() => setPhase("idle"), MAX_MS),
      );
    };
    // Capture phase: <Link> cancels the click's default (to navigate itself)
    // before a bubbling listener would see it.
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      clear();
    };
  }, []);

  // The URL changed before the bar showed: cancel it.
  useEffect(() => {
    clear();
  }, [url]);

  if (phase === "idle") return null;
  return (
    <div
      role="progressbar"
      aria-label="Loading page"
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5"
    >
      <div
        className={
          phase === "loading"
            ? "h-full w-[85%] origin-left animate-nav-progress bg-primary"
            : "h-full w-full bg-primary opacity-0 transition-opacity duration-300"
        }
      />
    </div>
  );
}
