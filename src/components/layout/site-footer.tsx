import Image from "next/image";
import Link from "next/link";
import footerWordmark from "@/assets/icons/footer-wordmark.svg";
import { siteConfig } from "@/config/site";
import { Disclosure } from "@/components/ui/disclosure";
import { FooterCurrency } from "@/features/currency/components/footer-currency";
import { FooterStar } from "./footer-star";

export function SiteFooter({ mobileHome = false }: { mobileHome?: boolean }) {
  return (
    <footer className="bg-primary text-white">
      <div
        className={
          mobileHome
            ? "mx-auto flex w-full max-w-480 flex-col items-center pt-[163px] pb-4 md:pt-[109px] md:pb-[59px]"
            : "mx-auto flex w-full max-w-480 flex-col items-center pt-16 pb-10 md:pt-[109px] md:pb-[59px]"
        }
      >
        <div className="w-full px-4 md:px-11">
          {siteConfig.footerSections.map((section) => (
            <Disclosure
              key={section.title}
              summaryClassName="py-[18px] focus-visible:outline-current"
              summary={
                <>
                  <span className="text-body-4 font-semibold tracking-[2px] uppercase">
                    {section.title}
                  </span>
                  <span
                    aria-hidden
                    className="text-[20px] leading-5 transition-transform duration-300 group-data-open:rotate-45"
                  >
                    +
                  </span>
                </>
              }
            >
              {section.links.length > 0 && (
                <ul className="flex flex-col gap-3 pb-4">
                  {section.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="text-body-2 transition-opacity hover:opacity-70"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Disclosure>
          ))}
          <div className={mobileHome ? "hidden md:block" : undefined}>
            <FooterCurrency />
          </div>
        </div>

        <FooterStar className="mt-2" />

        <div className="mt-4 w-full px-[2.88%]">
          <Image
            src={footerWordmark}
            alt=""
            className="h-auto w-full"
            sizes="100vw"
          />
        </div>
        {mobileHome && (
          <div className="mt-6 flex w-full items-center justify-between border-t border-white/30 px-10 pt-3 text-[8px] leading-3 tracking-[0.14em] text-white/70 md:hidden">
            <span>©2026 SWITCHBLADE</span>
            <span>ALL RIGHTS RESERVED</span>
          </div>
        )}
      </div>
    </footer>
  );
}
