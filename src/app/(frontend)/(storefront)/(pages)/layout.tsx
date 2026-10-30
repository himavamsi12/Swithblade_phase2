import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

/** Regular pages: header sits in the flow above the content. */
export default function PagesLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader tone="black" />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
