"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Animates its children's height open and closed. Grid rows (0fr ↔ 1fr)
 * rather than `<details>`, which can't animate closing in every browser.
 * Closed content is `inert`, so it's skipped by tab order and screen readers.
 */
export function Collapse({
  open,
  id,
  className,
  children,
}: {
  open: boolean;
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      id={id}
      inert={!open}
      className={cn(
        "grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}
    >
      <div className={cn("min-h-0 overflow-hidden", className)}>{children}</div>
    </div>
  );
}

/**
 * Accordion item: a toggle button over a `Collapse`. The root carries
 * `data-open`, so icons in `summary` can use `group-data-open:rotate-45`.
 */
export function Disclosure({
  summary,
  children,
  defaultOpen = false,
  className,
  summaryClassName,
  panelClassName,
}: {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  summaryClassName?: string;
  panelClassName?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();

  return (
    <div className={cn("group", className)} data-open={open || undefined}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full cursor-pointer items-center justify-between text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
          summaryClassName,
        )}
      >
        {summary}
      </button>
      <Collapse open={open} id={panelId} className={panelClassName}>
        {children}
      </Collapse>
    </div>
  );
}
