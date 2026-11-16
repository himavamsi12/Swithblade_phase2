"use client";

import { usePathname } from "next/navigation";
import { ViewTransition, type ReactNode } from "react";

/**
 * Fades the page content between routes with the browser's View Transitions
 * API (styles in globals.css: `page-exit` / `page-enter`): the old page
 * fades out quickly and the new one rises in. Keyed by pathname, so it only
 * plays when the route changes, never for in-page updates (bag edits,
 * checkout, filters in the query string). The header and footer sit outside
 * it and stay put. Browsers without view transitions just swap pages.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <ViewTransition
      key={pathname}
      enter="page-enter"
      exit="page-exit"
      default="none"
    >
      {children}
    </ViewTransition>
  );
}

/**
 * The same fade between the home page and the other pages, which have
 * different layouts (and headers): keyed by section, so it only plays when
 * crossing between them; PageTransition handles moves within a section.
 */
export function SectionTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <ViewTransition
      key={pathname === "/" ? "home" : "pages"}
      enter="page-enter"
      exit="page-exit"
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
