"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { siteConfig } from "@/config/site";
import { signOut } from "@/features/auth/actions";
import { cn } from "@/lib/utils";
import { focusRing } from "./styles";

// Return history is reached from each order card, so it lives under the
// Order history tab rather than having a tab of its own.
const tabs: { href: Route; label: string; matches?: string[] }[] = [
  { href: "/account", label: "Account details" },
  {
    href: "/account/orders" as Route,
    label: "Order history",
    matches: ["/account/returns"],
  },
];

const item = "block w-fit pb-3 text-body-1 uppercase";

export function AccountNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Account"
      className="flex gap-6 overflow-x-auto border-b border-stroke lg:flex-col lg:gap-8 lg:self-start lg:overflow-visible lg:pb-6"
    >
      {tabs.map((tab) => {
        const active =
          pathname === tab.href || !!tab.matches?.includes(pathname);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              item,
              "shrink-0 border-b-2 whitespace-nowrap",
              active
                ? "border-black text-black"
                : "border-transparent text-muted hover:text-black",
              focusRing,
            )}
          >
            {tab.label}
          </Link>
        );
      })}
      <Link
        href={siteConfig.wishlistHref}
        aria-current={pathname === siteConfig.wishlistHref ? "page" : undefined}
        className={cn(
          item,
          "shrink-0 border-b-2 border-transparent whitespace-nowrap text-muted hover:text-black md:hidden",
          focusRing,
        )}
      >
        Wishlist
      </Link>
      <form action={signOut} className="hidden shrink-0 md:block">
        <button
          type="submit"
          className={cn(
            item,
            "border-b-2 border-transparent text-red-600 hover:opacity-70",
            focusRing,
          )}
        >
          Signout
        </button>
      </form>
    </nav>
  );
}
