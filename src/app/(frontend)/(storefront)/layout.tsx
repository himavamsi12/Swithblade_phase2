import { SectionTransition } from "@/components/layout/page-transition";
import { BagSync } from "@/features/cart/components/bag-sync";

export default function StorefrontLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SectionTransition>{children}</SectionTransition>
      <BagSync />
    </>
  );
}
