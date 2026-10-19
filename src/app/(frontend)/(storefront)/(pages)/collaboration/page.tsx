import type { Metadata } from "next";
import Image from "next/image";
import { ProductCard } from "@/features/catalog/components/product-card";
import { listCollaborationProducts } from "@/features/catalog/repository";
import { PartnerSidebar } from "@/features/collaborations/components/partner-sidebar";
import { findPartner, partners } from "@/features/collaborations/partners";

const intro =
  "Limited capsules with the world's most considered brands — each one pushing both labels into new territory.";

export async function generateMetadata({
  searchParams,
}: PageProps<"/collaboration">): Promise<Metadata> {
  const { partner } = await searchParams;
  const current = findPartner(Array.isArray(partner) ? partner[0] : partner);
  return {
    title: `${current.name} Collaboration`,
    description: intro,
    // One canonical URL per partner; unknown ?partner= values fall back to the first.
    alternates: { canonical: `/collaboration?partner=${current.slug}` },
  };
}

export default async function CollaborationPage({
  searchParams,
}: PageProps<"/collaboration">) {
  const { partner } = await searchParams;
  const current = findPartner(Array.isArray(partner) ? partner[0] : partner);
  const products = await listCollaborationProducts(current.slug, 12);

  return (
    <div className="mx-auto w-full max-w-480 px-4 pb-24 md:px-12 md:pb-40">
      <header className="flex flex-col items-center gap-3 pt-12 text-center md:pt-20">
        <h1 className="text-h1 uppercase">Collaborations</h1>
        <p className="max-w-[500px] text-body-3">{intro}</p>
      </header>

      <div className="mt-12 grid grid-cols-[minmax(0,1fr)] gap-10 md:mt-[108px] lg:grid-cols-[300px_minmax(0,1fr)] lg:gap-x-[60px]">
        <PartnerSidebar
          partners={partners.map(({ slug, name, logo }) => ({
            slug,
            name,
            logo,
          }))}
          activeSlug={current.slug}
        />

        <section aria-labelledby="partner-name">
          <h2 id="partner-name" className="sr-only">
            {current.name}
          </h2>
          <Image
            src={current.logo}
            alt=""
            priority
            className="h-[70px] w-auto max-w-[240px] object-contain object-left"
          />
          <p className="mt-8 max-w-[680px] text-body-3 leading-[1.35]">
            {current.description}
          </p>

          <ul className="mt-10 grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-3 md:gap-x-5 md:gap-y-14 lg:grid-cols-4">
            {products.map((product) => (
              <li key={product.id}>
                <ProductCard product={product} variant="listing" />
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
