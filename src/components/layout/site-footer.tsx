import Image from "next/image";
import Link from "next/link";
import footerWordmark from "@/assets/icons/footer-wordmark.svg";
import { siteConfig } from "@/config/site";
import { FooterStar } from "./footer-star";

export function SiteFooter() {
  return (
    <footer className="bg-primary text-white">
      <div className="mx-auto flex w-full max-w-480 flex-col items-center pt-16 pb-10 md:pt-[109px] md:pb-[59px]">
        <div className="w-full px-4 md:px-11">
          {siteConfig.footerSections.map((section) => (
            <details key={section.title} className="group">
              <summary className="flex cursor-pointer list-none items-center justify-between py-[18px] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-current [&::-webkit-details-marker]:hidden">
                <span className="text-body-4 font-semibold tracking-[2px] uppercase">
                  {section.title}
                </span>
                <span
                  aria-hidden
                  className="text-[20px] leading-5 transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
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
            </details>
          ))}
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
      </div>
    </footer>
  );
}
