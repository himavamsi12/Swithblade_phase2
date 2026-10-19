import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { YouMayAlsoLike } from "@/features/catalog/components/you-may-also-like";
import { listRecommendedProducts } from "@/features/catalog/repository";
import { WishlistView } from "@/features/wishlist/components/wishlist-view";

export const metadata: Metadata = {
  title: "Wishlist",
  robots: { index: false },
};

export default async function WishlistPage() {
  const recommended = await listRecommendedProducts(8);

  return (
    <div className="mx-auto w-full max-w-480 px-4 pb-24 md:px-12 md:pb-[120px]">
      <Link
        href="/products"
        className="mt-8 inline-flex items-center gap-2 text-body-3 hover:underline md:mt-11"
      >
        <ArrowLeft size={14} aria-hidden />
        Back to Shopping
      </Link>

      <div className="mt-10 md:mt-14">
        <WishlistView />
      </div>

      <YouMayAlsoLike
        title="Recommended"
        products={recommended}
        className="pt-20 md:pt-28"
      />
    </div>
  );
}
