import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { siteConfig } from "@/config/site";

/** Centred title over a narrow column of numbered policy sections. */
export function LegalPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-480 px-4 pb-24 md:px-12 md:pb-40">
      <h1 className="border-b border-stroke pt-8 pb-4 text-center text-h3 uppercase md:pt-10">
        {title}
      </h1>
      <div className="mx-auto mt-8 flex max-w-[600px] flex-col gap-6 text-body-3 md:mt-10">
        {children}
      </div>
    </div>
  );
}

export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc pl-5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}

export function SupportEmail() {
  return (
    <a
      href={`mailto:${siteConfig.supportEmail}`}
      className="underline underline-offset-2 hover:text-primary"
    >
      {siteConfig.supportEmail}
    </a>
  );
}

export function LegalLink({
  href,
  children,
}: {
  href: Route;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="underline underline-offset-2 hover:text-primary"
    >
      {children}
    </Link>
  );
}
