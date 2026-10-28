"use client";

import Lenis from "lenis";
import { useEffect } from "react";

/**
 * Eases wheel and trackpad scrolling across the whole site. Lenis drives the
 * native window scroll, so sticky, scroll events and Next's scroll restoration
 * keep working. Reduced-motion users get plain scrolling (Lenis default).
 */
export function SmoothScroll() {
  useEffect(() => {
    const lenis = new Lenis({
      autoRaf: true,
      // Looser than the defaults (0.1 / 1): each wheel tick travels further
      // and glides out longer instead of stopping short.
      lerp: 0.07,
      wheelMultiplier: 1.2,
      // Pauses while `html` is overflow: hidden (open dialogs, cart drawer).
      autoToggle: true,
      // Scrollable panels (cart drawer list, size guide) scroll natively.
      allowNestedScroll: true,
      anchors: true,
      stopInertiaOnNavigate: true,
    });
    return () => lenis.destroy();
  }, []);

  return null;
}
