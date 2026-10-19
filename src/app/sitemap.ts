import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";
import { listProducts } from "@/features/catalog/repository";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const products = await listProducts();

  return [
    { url: siteConfig.url },
    { url: `${siteConfig.url}/products` },
    ...products.map((p) => ({ url: `${siteConfig.url}/products/${p.slug}` })),
  ];
}
