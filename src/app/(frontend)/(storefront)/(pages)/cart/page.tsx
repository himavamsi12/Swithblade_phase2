import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { BagView } from "@/features/cart/components/bag-view";
import { YouMayAlsoLike } from "@/features/catalog/components/you-may-also-like";
import { listRecommendedProducts } from "@/features/catalog/repository";

export const metadata: Metadata = {
  title: "Bag",
  // Personal, per-visitor content: keep it out of search results.
  robots: { index: false },
};

export default async function CartPage() {
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
        <BagView />
      </div>

      <YouMayAlsoLike products={recommended} className="pt-24 md:pt-[200px]" />
    </div>
  );
}
