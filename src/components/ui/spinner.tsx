import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * A small spinning loader for buttons and inline waits, in the current text
 * colour. Decorative: the caller's text ("Saving…") says what's happening.
 * With reduced motion it pulses instead of spinning.
 */
export function Spinner({
  size = 16,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <LoaderCircle
      size={size}
      strokeWidth={2}
      aria-hidden
      className={cn(
        "shrink-0 animate-spin motion-reduce:animate-pulse",
        className,
      )}
    />
  );
}

/** A button's label while it waits: spinner then text, centred. */
export function PendingLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center justify-center gap-2">
      <Spinner />
      {children}
    </span>
  );
}
