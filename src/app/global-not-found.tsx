import type { Metadata } from "next";
import Link from "next/link";
import { archivo } from "@/lib/fonts";
import "./(frontend)/globals.css";

export const metadata: Metadata = {
  title: "Page not found",
};

/**
 * 404 for URLs that match no route. Needed because the storefront and the
 * Payload admin each have their own root layout.
 */
export default function GlobalNotFound() {
  return (
    <html lang="en" className={`${archivo.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <main className="mx-auto flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
          <h1 className="text-h1">Page not found</h1>
          <p className="text-muted">
            That page doesn&apos;t exist or was moved.
          </p>
          <Link href="/" className="underline">
            Back to home
          </Link>
        </main>
      </body>
    </html>
  );
}
