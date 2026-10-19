import type { Route } from "next";
import { env } from "@/lib/env";

export const siteConfig = {
  name: "Swithblade",
  description: "Swithblade — precision blades and gear, shipped to your door.",
  url: env.NEXT_PUBLIC_SITE_URL,
  currency: "INR",
  nav: [
    // TODO: /categories doesn't exist yet; drop its `as Route` cast once it does.
    { label: "Categories", href: "/categories" as Route },
    { label: "Promises", href: "/promises" as const satisfies Route },
    { label: "Collaboration", href: "/collaboration" as const satisfies Route },
  ],
  // Footer accordion. Only "Shop" has content so far; the rest is TBD from the client.
  footerSections: [
    {
      title: "Shop",
      links: [
        { label: "All products", href: "/products" as Route },
        { label: "Cart", href: "/cart" as Route },
      ],
    },
    { title: "Discover", links: [] },
    { title: "Connect with us", links: [] },
    { title: "Support", links: [] },
    { title: "Socials", links: [] },
  ],
  // Quick links shown in the header search panel before anything is typed.
  searchSuggestions: ["T-shirts", "Sweatshirts", "Polos"],
  wishlistHref: "/wishlist" as const satisfies Route,
  accountHref: "/account" as const satisfies Route,
} as const;
