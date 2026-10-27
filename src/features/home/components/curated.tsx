"use client";

import Image, { type StaticImageData } from "next/image";
import { useEffect, useState } from "react";
import clothImg from "@/assets/footer-img/cloth-img.png";
import clothImg2 from "@/assets/footer-img/cloth-img-2.png";
import productImg from "@/assets/footer-img/product-img.png";
import productImg2 from "@/assets/footer-img/product-img-2.png";
import { cn } from "@/lib/utils";

type Slide = {
  look: { src: StaticImageData; alt: string };
  fabric: { src: StaticImageData; alt: string };
};

const slides: Slide[] = [
  {
    look: {
      src: productImg,
      alt: "Model in an olive zip-neck sweatshirt and mirrored sunglasses",
    },
    fabric: { src: clothImg, alt: "Close-up of olive cotton fabric" },
  },
  {
    look: {
      src: productImg2,
      alt: "Model in a beige zip-up jacket and tinted sunglasses",
    },
    fabric: { src: clothImg2, alt: "Close-up of beige cotton twill" },
  },
];

const INTERVAL_MS = 4000;

/**
 * Editorial split: large lookbook photo on the left, short manifesto on the
 * right. Every few seconds the next look slides up over the photo while the
 * fabric swatch cross-fades to match.
 */
export function Curated() {
  // `step` only ever counts up, so the outgoing slide is always `step - 1`.
  const [step, setStep] = useState(0);
  const active = step % slides.length;
  const previous = step > 0 ? (step - 1) % slides.length : -1;

  useEffect(() => {
    const id = setInterval(() => setStep((s) => s + 1), INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <section
      aria-labelledby="curated-heading"
      className="mx-auto grid w-full max-w-480 items-center gap-10 pt-12 pb-20 md:grid-cols-2 md:gap-0 md:pt-20 md:pb-40"
    >
      <div className="px-4 md:pr-0 md:pl-10">
        <div className="relative aspect-[1360/1312] overflow-hidden">
          {slides.map(({ look }, i) => (
            <Image
              key={i}
              src={look.src}
              alt={look.alt}
              aria-hidden={i !== active}
              sizes="(min-width: 768px) 50vw, 100vw"
              placeholder="blur"
              className={cn(
                "absolute inset-0 size-full object-cover",
                // Changing the animation name restarts it, so a slide that
                // goes out and comes back in replays its entrance.
                i === active && step > 0 && "z-10 animate-curated-in",
                i === previous && "animate-curated-out",
                i !== active && i !== previous && "invisible",
              )}
            />
          ))}
        </div>
      </div>

      <div className="flex justify-center px-4 md:px-0">
        <div className="flex w-full max-w-[270px] flex-col gap-4">
          <h2
            id="curated-heading"
            className="text-h5 whitespace-nowrap uppercase"
          >
            Curated, not collected
          </h2>
          <div className="relative aspect-[270/378]">
            {slides.map(({ fabric }, i) => (
              <Image
                key={i}
                src={fabric.src}
                alt={fabric.alt}
                aria-hidden={i !== active}
                sizes="270px"
                placeholder="blur"
                className={cn(
                  "absolute inset-0 size-full object-cover transition-opacity duration-900 ease-in-out motion-reduce:transition-none",
                  i === active ? "opacity-100" : "opacity-0",
                )}
              />
            ))}
          </div>
          <p className="mt-2 text-body-2 uppercase">
            Fewer pieces. Higher standard. Nothing arbitrary.
          </p>
        </div>
      </div>
    </section>
  );
}
