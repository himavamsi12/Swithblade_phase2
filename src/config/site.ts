import type { Route } from "next";
import { env } from "@/lib/env";

export const siteConfig = {
  name: "Swithblade",
  description: "Swithblade — precision blades and gear, shipped to your door.",
  url: env.NEXT_PUBLIC_SITE_URL,
  currency: "INR",
  nav: [
    // Opens a dropdown instead of linking anywhere.
    // TODO: only the Sweatshirts listing exists so far; point each at its own
    // category page once those routes do.
    {
      label: "Categories",
      items: [
        { label: "New arrivals", href: "/products" as Route },
        { label: "Blazers", href: "/products" as Route },
        { label: "Sweatshirts", href: "/products" as Route },
        { label: "Tank tops", href: "/products" as Route },
        { label: "Accessories", href: "/products" as Route },
      ],
    },
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
  supportEmail: "support@switchblade.com",
} as const;
