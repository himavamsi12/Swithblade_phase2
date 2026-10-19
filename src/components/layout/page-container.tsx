import { cn } from "@/lib/utils";

/** Standard centred content width for regular pages. Full-bleed sections skip it. */
export function PageContainer({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mx-auto w-full max-w-6xl px-4 py-10", className)}
      {...props}
    />
  );
}
