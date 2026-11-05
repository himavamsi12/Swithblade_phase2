import type { Route } from "next";
import { env } from "@/lib/env";

/** The header's Categories menu, also listed in the footer's Shop section. */
const categories = [
  { label: "New arrivals", href: "/products" as Route },
  { label: "Blazers", href: "/products" as Route },
  { label: "Sweatshirts", href: "/products" as Route },
  { label: "Tank tops", href: "/products" as Route },
  { label: "Accessories", href: "/products" as Route },
];

const supportEmail = "support@switchblade.in";

export const siteConfig = {
  name: "Switchblade",
  description: "Switchblade — precision blades and gear, shipped to your door.",
  url: env.NEXT_PUBLIC_SITE_URL,
  currency: "INR",
  nav: [
    // Opens a dropdown instead of linking anywhere.
    // TODO: only the Sweatshirts listing exists so far; point each at its own
    // category page once those routes do.
    { label: "Categories", items: categories },
    { label: "Promises", href: "/promises" as const satisfies Route },
    { label: "Collaboration", href: "/collaboration" as const satisfies Route },
  ],
  // Footer accordion. Links starting with "http" or "mailto:" leave the site.
  footerSections: [
    {
      title: "Shop",
      links: [...categories, { label: "Cart", href: "/cart" as Route }],
    },
    {
      title: "Discover",
      links: [
        // The Phase 1 brand site.
        { label: "Switchblade Story", href: "https://switchblade.in" },
        { label: "Collaboration", href: "/collaboration" as Route },
        { label: "Promises", href: "/promises" as Route },
      ],
    },
    {
      title: "Support",
      links: [
        { label: "FAQ", href: "/faq" as Route },
        { label: "Returns & refunds", href: "/returns-policy" as Route },
        { label: "Terms & conditions", href: "/terms-and-conditions" as Route },
        { label: "Privacy policy", href: "/privacy-policy" as Route },
      ],
    },
    { title: "Socials", links: [] },
  ],
  // Quick links shown in the header search panel before anything is typed.
  searchSuggestions: ["T-shirts", "Sweatshirts", "Polos"],
  wishlistHref: "/wishlist" as const satisfies Route,
  accountHref: "/account" as const satisfies Route,
  supportEmail,
} as const;
