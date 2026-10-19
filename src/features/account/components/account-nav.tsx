"use client";

import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/features/auth/actions";
import { cn } from "@/lib/utils";
import { focusRing } from "./styles";

const tabs: { href: Route; label: string }[] = [
  { href: "/account", label: "Account details" },
  { href: "/account/orders" as Route, label: "Order history" },
  { href: "/account/returns" as Route, label: "Return history" },
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
        const active = pathname === tab.href;
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
      <form action={signOut} className="shrink-0">
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
