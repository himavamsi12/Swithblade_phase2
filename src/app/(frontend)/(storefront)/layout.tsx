import { SiteFooter } from "@/components/layout/site-footer";
import { CurrencyPrompt } from "@/features/currency/components/currency-prompt";

export default function StorefrontLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      {children}
      <SiteFooter />
      <CurrencyPrompt />
    </>
  );
}
