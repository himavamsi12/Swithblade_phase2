"use client";

import { useEffect, useState } from "react";

/**
 * For the home page's see-through header, which stays fixed at the top:
 * once the page scrolls, this carries `data-header-panel-open`, so the
 * header turns black on white (as while search is open) and stays readable
 * over the content below the hero.
 */
export function HeaderScrolled() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const update = () => setScrolled(window.scrollY > 24);
    update();
    window.addEventListener("scroll", update, { passive: true });
    return () => window.removeEventListener("scroll", update);
  }, []);

  return scrolled ? <span hidden data-header-panel-open /> : null;
}
