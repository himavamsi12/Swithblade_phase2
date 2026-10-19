import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import look1 from "@/assets/new arrivals/1.png";
import look2 from "@/assets/new arrivals/2.png";
import look3 from "@/assets/new arrivals/3.png";

type Tile = {
  image: StaticImageData;
  alt: string;
  label: string;
  href: "/products";
};

// TEMPORARY: hardcoded from the design until categories come from the CMS.
const tiles: Tile[] = [
  {
    image: look1,
    alt: "Model in an ivory oversized shirt and wide-leg trousers",
    label: "Blazers",
    href: "/products",
  },
  {
    image: look2,
    alt: "Model in a sheer white blouse with a draped scarf collar",
    label: "Blazers",
    href: "/products",
  },
  {
    image: look3,
    alt: "Model in a grey wrap blouse and cream trousers with a suede bag",
    label: "Blazers",
    href: "/products",
  },
];

/** Three full-height lookbook photos, each labelled with the category it links to. */
export function CategoryTiles() {
  return (
    <section
      aria-label="Shop by category"
      className="mx-auto w-full max-w-480 px-2"
    >
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {tiles.map((tile, i) => (
          <li key={i}>
            <Link
              href={tile.href}
              className="group relative block overflow-hidden bg-card"
            >
              <Image
                src={tile.image}
                alt={tile.alt}
                sizes="(min-width: 640px) 33vw, 100vw"
                placeholder="blur"
                className="h-auto w-full transition-transform duration-500 group-hover:scale-[1.02]"
              />
              <span className="absolute bottom-4 left-4 bg-primary px-3 py-1 text-body-2 text-white md:bottom-5 md:left-5">
                {tile.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
