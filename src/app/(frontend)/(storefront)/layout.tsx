import { SiteFooter } from "@/components/layout/site-footer";
import { BagSync } from "@/features/cart/components/bag-sync";
import { CurrencyPrompt } from "@/features/currency/components/currency-prompt";

export default function StorefrontLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      {children}
      <SiteFooter />
      <CurrencyPrompt />
      <BagSync />
    </>
  );
}
