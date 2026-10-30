import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";

/** Home: the white header overlays the full-bleed hero. */
export default function HomeLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <div className="relative flex-1">
        <SiteHeader
          tone="white"
          mobileHome
          className="absolute inset-x-0 top-0 z-10"
        />
        <main>{children}</main>
      </div>
      <SiteFooter mobileHome />
    </>
  );
}
