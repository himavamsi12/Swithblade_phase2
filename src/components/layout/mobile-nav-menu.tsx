"use client";

import Image from "next/image";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { Route } from "next";
import { siteConfig } from "@/config/site";
import { signOut } from "@/features/auth/actions";
import { headerAssets } from "./site-header-assets";

type MobileNavItem = (typeof siteConfig.nav)[number];

type MobileNavMenuProps = {
  items: readonly MobileNavItem[];
  homeLayout?: boolean;
};

export function MobileNavMenu({
  items,
  homeLayout = false,
}: MobileNavMenuProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(true);
  const categories = items.find(
    (item): item is Extract<MobileNavItem, { items: readonly unknown[] }> =>
      "items" in item,
  );
  const navigationItems = items.filter(
    (item): item is Extract<MobileNavItem, { href: unknown }> => "href" in item,
  );

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReduceMotion(mediaQuery.matches);
    updatePreference();
    mediaQuery.addEventListener("change", updatePreference);
    return () => mediaQuery.removeEventListener("change", updatePreference);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    const previousRootOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };
    const closeOnDesktopResize = () => {
      if (window.matchMedia("(min-width: 768px)").matches) setIsOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    window.addEventListener("resize", closeOnDesktopResize);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.documentElement.style.overflow = previousRootOverflow;
      window.removeEventListener("keydown", closeOnEscape);
      window.removeEventListener("resize", closeOnDesktopResize);
    };
  }, [isOpen]);

  const closeMenu = () => setIsOpen(false);

  return (
    <div
      className={`relative z-50 md:hidden ${homeLayout ? "col-start-1 row-start-1" : ""}`}
    >
      <button
        type="button"
        aria-label="Open navigation menu"
        aria-expanded={isOpen}
        aria-controls="mobile-navigation"
        onClick={() => setIsOpen(true)}
        className="flex h-9 w-9 flex-col items-center justify-center gap-[5px] text-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
      >
        <span className="h-px w-[18px] bg-current" />
        <span className="h-px w-[18px] bg-current" />
        <span className="h-px w-[18px] bg-current" />
      </button>

      <div
        id="mobile-navigation"
        role="dialog"
        aria-modal="true"
        aria-label="Mobile navigation"
        aria-hidden={!isOpen}
        inert={!isOpen}
        className={`fixed inset-0 z-[100] h-dvh w-screen overflow-y-auto overscroll-contain bg-white text-black transition-transform duration-300 ease-out motion-reduce:transition-none ${
          isOpen
            ? "pointer-events-auto translate-x-0"
            : "pointer-events-none -translate-x-full"
        }`}
      >
        <div className="min-h-full">
          <div className="sticky top-0 z-10 flex h-[72px] items-center justify-between bg-white px-6">
            <button
              type="button"
              aria-label="Close navigation menu"
              onClick={closeMenu}
              className="flex h-9 w-9 items-center justify-center focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current"
            >
              <span className="relative block h-5 w-5">
                <span className="absolute top-1/2 left-0 h-px w-full -rotate-45 bg-current" />
                <span className="absolute top-1/2 left-0 h-px w-full rotate-45 bg-current" />
              </span>
            </button>

            <Link
              href="/"
              aria-label={`${siteConfig.name} home`}
              onClick={closeMenu}
              className="flex items-center gap-[2.536px]"
            >
              <Image
                src={headerAssets.black.logoMark}
                alt=""
                width={16}
                height={24}
                className="h-[24px] w-[16px]"
              />
              <Image
                src={headerAssets.black.wordmark}
                alt=""
                width={158}
                height={12}
                className="h-3 w-[158px]"
              />
              <Image
                src={headerAssets.black.logoTm}
                alt=""
                width={5}
                height={3}
                className="mt-[2.68px] -ml-[1.5px] h-[2.61px] w-[5.183px] self-start"
              />
            </Link>

            <span aria-hidden="true" className="h-9 w-9" />
          </div>

          <nav
            aria-label="Mobile"
            className="flex min-h-[calc(100dvh-72px)] flex-col px-6 pt-5"
          >
            <ul className="flex flex-col gap-0">
              {categories && (
                <li
                  className={`border-b border-black/15 transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none ${
                    isOpen
                      ? "translate-y-0 opacity-100"
                      : "translate-y-2 opacity-0"
                  }`}
                  style={{
                    transitionDelay: isOpen && !reduceMotion ? "45ms" : "0ms",
                  }}
                >
                  <button
                    type="button"
                    aria-expanded={categoriesOpen}
                    aria-controls="mobile-category-links"
                    onClick={() => setCategoriesOpen((open) => !open)}
                    className="flex min-h-14 w-full items-center justify-between py-4 text-left text-sm tracking-[0.12em] uppercase"
                  >
                    {categories.label}
                    <span
                      aria-hidden="true"
                      className={`ml-4 inline-block h-2 w-2 rotate-45 border-r border-b transition-transform duration-200 motion-reduce:transition-none ${
                        categoriesOpen ? "-translate-y-0.5 rotate-[225deg]" : ""
                      }`}
                    />
                  </button>

                  <div
                    id="mobile-category-links"
                    hidden={!categoriesOpen}
                    className="pb-5"
                  >
                    <ul className="flex flex-col border-t border-black/10 pl-3 [&>li:last-child>a]:border-b-0">
                      {categories.items.map((category) => (
                        <li key={category.label}>
                          <Link
                            href={category.href}
                            onClick={closeMenu}
                            aria-current={
                              pathname === category.href ? "page" : undefined
                            }
                            className="block border-b border-black/10 py-3 text-xs tracking-[0.1em] uppercase"
                          >
                            {category.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </li>
              )}

              {navigationItems.map((item, index) => (
                <li
                  key={item.label}
                  className={`border-b border-black/15 transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none ${
                    isOpen
                      ? "translate-y-0 opacity-100"
                      : "translate-y-2 opacity-0"
                  }`}
                  style={{
                    transitionDelay:
                      isOpen && !reduceMotion ? `${(index + 2) * 45}ms` : "0ms",
                  }}
                >
                  <Link
                    href={item.href}
                    onClick={closeMenu}
                    aria-current={pathname === item.href ? "page" : undefined}
                    className="flex min-h-14 items-center py-4 text-sm tracking-[0.12em] uppercase"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>

            <ul className="sticky bottom-0 mt-auto flex flex-col gap-5 bg-white pt-8 pb-[max(2rem,env(safe-area-inset-bottom))]">
              {[
                {
                  label: "WISHLIST",
                  href: siteConfig.wishlistHref,
                  icon: headerAssets.black.wishlist,
                  width: 17,
                  height: 16,
                },
                {
                  label: "BAG",
                  href: "/cart" as const satisfies Route,
                  icon: headerAssets.black.bag,
                  width: 14,
                  height: 16,
                },
                {
                  label: "PROFILE",
                  href: siteConfig.accountHref,
                  icon: headerAssets.black.account,
                  width: 16,
                  height: 17,
                },
              ].map((item, index) => (
                <li
                  key={item.label}
                  className={`transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none ${
                    isOpen
                      ? "translate-y-0 opacity-100"
                      : "translate-y-2 opacity-0"
                  }`}
                  style={{
                    transitionDelay:
                      isOpen && !reduceMotion ? `${(index + 5) * 45}ms` : "0ms",
                  }}
                >
                  <Link
                    href={item.href}
                    onClick={closeMenu}
                    aria-current={pathname === item.href ? "page" : undefined}
                    className="flex min-h-10 items-center gap-3 text-[11px] tracking-[0.14em]"
                  >
                    <Image
                      src={item.icon}
                      alt=""
                      width={item.width}
                      height={item.height}
                    />
                    {item.label}
                  </Link>
                </li>
              ))}
              <li
                className={`transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none ${
                  isOpen
                    ? "translate-y-0 opacity-100"
                    : "translate-y-2 opacity-0"
                }`}
                style={{
                  transitionDelay: isOpen && !reduceMotion ? "360ms" : "0ms",
                }}
              >
                <form action={signOut}>
                  <button
                    type="submit"
                    className="flex min-h-10 items-center gap-3 text-[11px] tracking-[0.14em]"
                  >
                    <LogOut size={16} aria-hidden="true" />
                    SIGN OUT
                  </button>
                </form>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </div>
  );
}
