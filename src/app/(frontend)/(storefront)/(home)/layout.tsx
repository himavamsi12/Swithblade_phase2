import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

/** Home: the white header overlays the full-bleed hero and stays at the top. */
export default function HomeLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <div className="relative flex-1">
        <SiteHeader
          tone="white"
          mobileHome
          className="fixed inset-x-0 top-0 z-40"
        />
        <main>{children}</main>
      </div>
      <SiteFooter mobileHome />
    </>
  );
}
