"use client";

import { Search } from "lucide-react";
import Image, { type StaticImageData } from "next/image";
import Link from "next/link";
import { useId, useState } from "react";
import { cn } from "@/lib/utils";

type SidebarPartner = { slug: string; name: string; logo: StaticImageData };

/** Case- and accent-insensitive, so "stussy" finds "Stüssy". */
const normalize = (s: string) =>
  s.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase();

/*
 * Logos range from wide wordmarks (Chanel) to compact marks (Stüssy). Giving
 * each the same area, rather than the same box, makes them look equally sized.
 */
const LOGO_AREA = 1600;
const LOGO_AREA_LG = 2600;

const logoWidth = (logo: StaticImageData, area: number) =>
  `${Math.round(Math.sqrt((area * logo.width) / logo.height))}px`;

/** Partner search and logo list; each logo links to that partner's capsule. */
export function PartnerSidebar({
  partners,
  activeSlug,
}: {
  partners: SidebarPartner[];
  activeSlug: string;
}) {
  const id = useId();
  const [query, setQuery] = useState("");
  const matches = partners.filter((p) =>
    normalize(p.name).includes(normalize(query.trim())),
  );

  return (
    <nav aria-label="Collaboration partners" className="flex flex-col">
      <label htmlFor={`${id}-search`} className="sr-only">
        Search for partners
      </label>
      <div className="relative">
        <Search
          size={14}
          aria-hidden
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-black"
        />
        <input
          id={`${id}-search`}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search for partners"
          className="h-10 w-full bg-card pr-3 pl-9 text-body-3 text-black placeholder:text-muted focus:outline-2 focus:-outline-offset-2 focus:outline-black"
        />
      </div>

      {matches.length === 0 ? (
        <p className="mt-8 text-body-3 text-muted">No partners found.</p>
      ) : (
        <ul className="mt-8 flex gap-8 overflow-x-auto pb-2 lg:flex-col lg:gap-6 lg:overflow-visible lg:pb-0">
          {matches.map((p) => {
            const active = p.slug === activeSlug;
            return (
              <li key={p.slug} className="shrink-0">
                <Link
                  href={`/collaboration?partner=${p.slug}`}
                  scroll={false}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-12 w-fit items-center transition-opacity focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary lg:h-14",
                    active ? "opacity-100" : "opacity-45 hover:opacity-100",
                  )}
                >
                  <Image
                    src={p.logo}
                    alt={p.name}
                    style={
                      {
                        "--logo-w": logoWidth(p.logo, LOGO_AREA),
                        "--logo-w-lg": logoWidth(p.logo, LOGO_AREA_LG),
                      } as React.CSSProperties
                    }
                    className="h-auto w-(--logo-w) lg:w-(--logo-w-lg)"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </nav>
  );
}
