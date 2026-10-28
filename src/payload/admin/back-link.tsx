"use client";

import { Gutter, useConfig } from "@payloadcms/ui";
import type { Route } from "next";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * "← Back" above a collection list (to the dashboard) and in a document's
 * controls (to its list).
 */
export function BackLink() {
  const pathname = usePathname();
  const { config } = useConfig();
  const admin = config.routes.admin;
  const match = pathname.match(/\/collections\/([^/]+)(\/[^/]+)?/);
  if (!match) return null;

  const [, slug, doc] = match;
  const collection = config.collections.find((c) => c.slug === slug);
  const plural = collection?.labels?.plural;
  const listLabel = typeof plural === "string" ? plural : slug;
  const href = doc ? `${admin}/collections/${slug}` : admin;

  const link = (
    <Link href={href as Route} className="sb-back-link">
      <span aria-hidden>←</span>
      {doc ? `Back to ${listLabel}` : "Back to dashboard"}
    </Link>
  );
  // Payload renders the list slot outside its page gutter; the document
  // controls slot is already inside one.
  return doc ? link : <Gutter className="sb-back-gutter">{link}</Gutter>;
}
