import { BagSync } from "@/features/cart/components/bag-sync";

export default function StorefrontLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      {children}
      <BagSync />
    </>
  );
}
