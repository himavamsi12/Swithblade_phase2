import type { StaticImageData } from "next/image";
import calvinKlein from "@/assets/collaborations/calvin-klein.svg";
import chanel from "@/assets/collaborations/chanel.svg";
import nike from "@/assets/collaborations/nike.svg";
import puma from "@/assets/collaborations/puma.svg";
import stussy from "@/assets/collaborations/stussy.svg";

export type Partner = {
  slug: string;
  name: string;
  logo: StaticImageData;
  /** Shown beside the partner's products. */
  description: string;
};

/*
 * Collaboration partners, in sidebar order.
 * TEMPORARY: descriptions are short brand backgrounds as placeholders; swap
 * in the copy for each capsule (and move this list to the CMS) when ready.
 */
export const partners: Partner[] = [
  {
    slug: "nike",
    name: "Nike",
    logo: nike,
    description:
      "Nike, Inc. is a global athletic powerhouse that transformed sports apparel and cultural fashion into a multi-billion dollar empire. Originally founded in 1964 as Blue Ribbon Sports, the company officially rebranded as Nike in 1971, taking its name from the Greek goddess of victory. Under the leadership of founders Phil Knight and Bill Bowerman, the brand established itself through innovative footwear engineering, such as the famous waffle sole, and soon evolved into the world's largest supplier of athletic shoes and apparel.",
  },
  {
    slug: "calvin-klein",
    name: "Calvin Klein",
    logo: calvinKlein,
    description:
      "Calvin Klein was founded in New York in 1968 by Calvin Klein and Barry Schwartz. Known for clean lines and a minimalist point of view, the label became a defining name in American fashion, from tailoring and denim to its famous underwear and fragrance lines.",
  },
  {
    slug: "puma",
    name: "Puma",
    logo: puma,
    description:
      "Puma was founded in 1948 in Herzogenaurach, Germany, by Rudolf Dassler. It grew into one of the world's leading sports brands, pairing performance footwear and apparel with a long history in football, running and street culture.",
  },
  {
    slug: "chanel",
    name: "Chanel",
    logo: chanel,
    description:
      "Chanel was founded in Paris by Gabrielle “Coco” Chanel, who opened her first boutique in 1910. The house redefined modern womenswear with jersey tailoring, the little black dress and the tweed suit, and remains one of the most recognised names in luxury fashion.",
  },
  {
    slug: "stussy",
    name: "Stüssy",
    logo: stussy,
    description:
      "Stüssy began in Laguna Beach, California, in the early 1980s, when Shawn Stussy started signing his surfboards with his now-famous scrawl. The mark moved onto T-shirts and caps and grew into a foundational streetwear label.",
  },
];

export const findPartner = (slug: string | undefined) =>
  partners.find((p) => p.slug === slug) ?? partners[0]!;
