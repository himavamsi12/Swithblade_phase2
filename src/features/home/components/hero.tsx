import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";

type HeroProps = {
  image: string;
  title: string;
  ctaLabel: string;
  href: Route;
};

/** Full-bleed hero with the call to action anchored bottom right. */
export function Hero({ image, title, ctaLabel, href }: HeroProps) {
  return (
    <section
      aria-label={title}
      className="relative h-svh min-h-120 w-full overflow-hidden"
    >
      <Image
        src={image}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover"
      />
      <div
        aria-hidden
        className="absolute inset-0 bg-linear-to-b from-black/30 via-transparent via-50% to-black/10"
      />
      <div className="absolute right-4 bottom-8 flex flex-col items-end gap-4 md:right-10 md:bottom-16">
        <h1 className="text-h2 leading-[normal] text-white">{title}</h1>
        <Link
          href={href}
          className="bg-primary px-3.5 py-2 text-body-1 leading-[normal] text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          {ctaLabel}
        </Link>
      </div>
    </section>
  );
}
