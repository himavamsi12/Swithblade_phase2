import { SiteFooter } from "@/components/layout/site-footer";
import { BagSync } from "@/features/cart/components/bag-sync";

export default function StorefrontLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      {children}
      <SiteFooter />
      <BagSync />
    </>
  );
}
