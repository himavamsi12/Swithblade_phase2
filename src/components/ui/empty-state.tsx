import type { Route } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Centred message with a single call to action (empty bag, wishlist, search). */
export function EmptyState({
  message,
  action,
  href = "/products",
  as: Heading = "p",
  className,
}: {
  message: ReactNode;
  action: string;
  href?: Route;
  /** Render the message as a heading when it is the page's main content. */
  as?: "p" | "h1" | "h2";
  className?: string;
}) {
  return (
    <div
      className={cn("flex flex-col items-center gap-5 text-center", className)}
    >
      <Heading className="text-h4 font-normal">{message}</Heading>
      <Link
        href={href}
        className="inline-flex h-11 w-full max-w-[236px] items-center justify-center bg-primary px-6 text-body-2 text-white transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {action}
      </Link>
    </div>
  );
}
