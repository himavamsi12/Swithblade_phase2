"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import footerStar from "@/assets/images/footer-star.png";
import { cn } from "@/lib/utils";

// The 3D code (three.js + react-three-fiber) is split into its own chunk and
// only downloaded once the footer is about to scroll into view.
const Star3D = dynamic(() => import("@/components/three/star-3d"), {
  ssr: false,
});

function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

/**
 * Footer star: the chrome star photo first, crossfading to the rotating 3D
 * model once it has loaded. Falls back to the photo without WebGL.
 */
export function FooterStar({ className }: { className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted3D, setMounted3D] = useState(false);
  const [onScreen, setOnScreen] = useState(false);
  const [ready, setReady] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const onReady = useCallback(() => setReady(true), []);

  useEffect(() => {
    const el = ref.current;
    if (!el || !supportsWebGL()) return;

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(motion.matches);
    const onMotion = () => setReducedMotion(motion.matches);
    motion.addEventListener("change", onMotion);

    // Load a screen early so it's ready as it arrives; render only while visible.
    const near = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setMounted3D(true);
          near.disconnect();
        }
      },
      { rootMargin: "100% 0px" },
    );
    const visible = new IntersectionObserver(([entry]) =>
      setOnScreen(Boolean(entry?.isIntersecting)),
    );
    near.observe(el);
    visible.observe(el);
    return () => {
      near.disconnect();
      visible.disconnect();
      motion.removeEventListener("change", onMotion);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={cn("relative size-[clamp(150px,13vw,210px)]", className)}
    >
      <Image
        src={footerStar}
        alt=""
        sizes="140px"
        className={cn(
          "absolute top-1/2 left-1/2 h-[74%] w-auto -translate-x-1/2 -translate-y-1/2 object-contain transition-opacity duration-700",
          ready && "opacity-0",
        )}
      />
      {mounted3D && (
        <div
          className={cn(
            "absolute inset-0 transition-opacity duration-700",
            ready ? "opacity-100" : "opacity-0",
          )}
        >
          <Star3D
            active={onScreen}
            reducedMotion={reducedMotion}
            onReady={onReady}
          />
        </div>
      )}
    </div>
  );
}
