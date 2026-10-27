import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductGallery } from "@/features/catalog/components/product-gallery";
import { ProductPurchase } from "@/features/catalog/components/product-purchase";
import { PromiseLabel } from "@/features/catalog/components/promise-label";
import { YouMayAlsoLike } from "@/features/catalog/components/you-may-also-like";
import { WishlistButton } from "@/features/wishlist/components/wishlist-button";
import {
  getProductBySlug,
  listProducts,
  listRelatedProducts,
} from "@/features/catalog/repository";
import { Price } from "@/features/currency/components/price";

export async function generateStaticParams() {
  const products = await listProducts();
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};
  return { title: product.name, description: product.description };
}

export default async function ProductPage({
  params,
}: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const related = await listRelatedProducts(product, 8);

  return (
    <div className="mx-auto w-full max-w-480 px-4 pb-16 md:px-12 md:pb-[120px]">
      <div className="grid gap-8 pt-6 md:pt-12 lg:grid-cols-[7fr_3fr]">
        <ProductGallery images={product.gallery} name={product.name} />

        <div className="lg:sticky lg:top-6 lg:self-start lg:pt-11 lg:pl-11">
          <div className="flex items-start justify-between gap-4">
            <div className="flex flex-col gap-1">
              <h1 className="text-body-1 uppercase">{product.name}</h1>
              <p className="text-body-2">
                <Price
                  amount={product.price}
                  currency={product.currency}
                  compact
                />
              </p>
            </div>
            <WishlistButton
              className="mt-0.5"
              item={{
                productId: product.id,
                slug: product.slug,
                name: product.name,
                image: product.image,
                imageFrame: product.imageFrame,
                price: product.price,
                currency: product.currency,
                inStock: product.inStock,
                colors: product.colors,
                sizes: product.sizes,
              }}
            />
          </div>

          <p className="mt-6 text-body-3 text-muted">{product.description}</p>

          {product.highlighted && <PromiseLabel className="mt-6" />}

          <div className="mt-8">
            <ProductPurchase
              product={{
                id: product.id,
                slug: product.slug,
                name: product.name,
                price: product.price,
                currency: product.currency,
                image: product.image,
                inStock: product.inStock,
              }}
              colors={product.colors}
              sizes={product.sizes}
              modelImage={product.gallery[1] ?? product.image}
            />
          </div>

          <div className="mt-10 lg:mt-[200px]">
            {[
              { title: "Details", body: product.details },
              { title: "Shipping & Returns", body: product.shippingReturns },
            ].map((item) => (
              <details
                key={item.title}
                className="group border-b border-border"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between py-2 text-body-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary [&::-webkit-details-marker]:hidden">
                  {item.title}
                  <span
                    aria-hidden
                    className="transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="pb-4 text-body-3 text-muted">{item.body}</p>
              </details>
            ))}
          </div>
        </div>
      </div>

      <YouMayAlsoLike products={related} className="pt-16 md:pt-[150px]" />
    </div>
  );
}
