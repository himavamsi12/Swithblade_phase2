"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { archivo } from "@/lib/fonts";
import "./(frontend)/globals.css";

/**
 * Last-resort error page, for errors in a root layout itself (the route
 * groups' error.tsx can't catch those). Replaces the layout, so it renders
 * its own <html> and <body>.
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en" className={`${archivo.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        <main className="mx-auto flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
          <h1 className="text-h2">Something went wrong</h1>
          <p className="text-muted">Please try again.</p>
          <Button onClick={() => retry()}>Try again</Button>
        </main>
      </body>
    </html>
  );
}
