import { SiteFooter } from "@/components/layout/site-footer";

export default function StorefrontLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      {children}
      <SiteFooter />
    </>
  );
}
