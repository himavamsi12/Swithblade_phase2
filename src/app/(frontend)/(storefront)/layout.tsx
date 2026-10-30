import { BagSync } from "@/features/cart/components/bag-sync";
import { CurrencyPrompt } from "@/features/currency/components/currency-prompt";

export default function StorefrontLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      {children}
      <CurrencyPrompt />
      <BagSync />
    </>
  );
}
