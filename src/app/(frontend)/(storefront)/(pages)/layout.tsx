import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

/** Regular pages: header stays at the top of the screen above the content. */
export default function PagesLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <SiteHeader tone="black" className="sticky top-0 z-40 bg-white" />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </>
  );
}
