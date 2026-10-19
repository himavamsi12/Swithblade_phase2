"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    // Hook up an error reporter (Sentry, etc.) here.
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <h1 className="text-h2">Something went wrong</h1>
      <p className="text-muted">Please try again.</p>
      <Button onClick={() => retry()}>Try again</Button>
    </main>
  );
}
