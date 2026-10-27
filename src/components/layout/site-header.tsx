import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { CartDrawer } from "@/features/cart/components/cart-drawer";
import { HeaderSearch } from "@/features/search/components/header-search";
import { cn } from "@/lib/utils";
import { NavMenu } from "./nav-menu";
import { headerAssets, type HeaderTone } from "./site-header-assets";

const navLink =
  "text-body-4 tracking-[0.1em] uppercase transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current";

const iconButton =
  "flex items-center justify-center transition-opacity hover:opacity-70 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-current";

type SiteHeaderProps = {
  /** "white" (Figma "Default") sits on dark backgrounds, "black" on light ones. */
  tone?: HeaderTone;
  className?: string;
};

/**
 * A header graphic in the header's tone. The white header turns black on
 * white while search is open, so it also carries the black variant, which
 * stays `display: none` (and, being lazy, undownloaded) until then.
 */
function ToneImage({
  tone,
  asset,
  ...props
}: {
  tone: HeaderTone;
  asset: keyof (typeof headerAssets)["white"];
} & Omit<React.ComponentProps<typeof Image>, "src" | "alt">) {
  const image = <Image src={headerAssets[tone][asset]} alt="" {...props} />;
  if (tone === "black") return image;
  return (
    <>
      <Image
        src={headerAssets.white[asset]}
        alt=""
        {...props}
        className={cn(
          props.className,
          "group-has-[[data-header-panel-open]]/header:hidden",
        )}
      />
      <Image
        src={headerAssets.black[asset]}
        alt=""
        {...props}
        className={cn(
          props.className,
          "hidden group-has-[[data-header-panel-open]]/header:block",
        )}
      />
    </>
  );
}

export function SiteHeader({ tone = "white", className }: SiteHeaderProps) {
  return (
    <header
      // Positioned stacking context: the search panel hangs off its bottom edge.
      className={cn(
        "group/header relative z-30",
        tone === "white"
          ? // Black on white while a header panel (search, cart) is open.
            "text-white transition-colors duration-300 has-[[data-header-panel-open]]:bg-white has-[[data-header-panel-open]]:text-black motion-reduce:transition-none"
          : "text-black",
        className,
      )}
    >
      <div className="relative mx-auto flex max-w-480 flex-wrap items-center justify-between gap-y-4 px-4 py-4 md:flex-nowrap md:px-10 md:py-5">
        <nav
          aria-label="Main"
          className="order-3 flex w-full items-center gap-6 md:order-none md:w-auto"
        >
          {siteConfig.nav.map((item) =>
            "items" in item ? (
              <NavMenu
                key={item.label}
                label={item.label}
                items={item.items}
                className={navLink}
              />
            ) : (
              <Link key={item.label} href={item.href} className={navLink}>
                {item.label}
              </Link>
            ),
          )}
        </nav>

        <Link
          href="/"
          aria-label={`${siteConfig.name} home`}
          className="order-1 flex md:absolute md:top-1/2 md:left-1/2 md:order-none md:-translate-x-1/2 md:-translate-y-1/2"
        >
          <span className="relative flex h-[25.257px] items-center gap-[2.536px]">
            <ToneImage
              tone={tone}
              asset="logoMark"
              width={16}
              height={24}
              className="h-[24.139px] w-[15.902px] shrink-0"
            />
            <ToneImage
              tone={tone}
              asset="wordmark"
              width={158}
              height={12}
              className="h-3 w-[158px] shrink-0"
            />
            <ToneImage
              tone={tone}
              asset="logoTm"
              width={5}
              height={3}
              // In the flow after the wordmark, raised to its top-right corner.
              className="mt-[2.68px] -ml-[1.5px] h-[2.61px] w-[5.183px] shrink-0 self-start"
            />
          </span>
        </Link>

        <div className="order-2 flex items-center gap-5 md:order-none">
          <HeaderSearch
            icon={
              <ToneImage tone={tone} asset="search" width={17} height={17} />
            }
            className={iconButton}
          />
          <Link
            href={siteConfig.wishlistHref}
            aria-label="Wishlist"
            className={iconButton}
          >
            <ToneImage tone={tone} asset="wishlist" width={17} height={16} />
          </Link>
          <CartDrawer
            icon={<ToneImage tone={tone} asset="bag" width={14} height={16} />}
            className={iconButton}
          />
          <Link
            href={siteConfig.accountHref}
            aria-label="Account"
            className={iconButton}
          >
            <ToneImage tone={tone} asset="account" width={16} height={17} />
          </Link>
        </div>
      </div>
    </header>
  );
}
