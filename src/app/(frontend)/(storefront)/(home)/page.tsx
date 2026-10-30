import { CategoryTiles } from "@/features/home/components/category-tiles";
import { Curated } from "@/features/home/components/curated";
import { Hero } from "@/features/home/components/hero";
import { ProductShelf } from "@/features/catalog/components/product-shelf";

export default function HomePage() {
  return (
    <>
      <Hero
        image="/images/hero/hero.png"
        title="Tank Tops"
        ctaLabel="Shop now"
        href="/products"
      />

      <ProductShelf
        title="New arrivals"
        collection="new-arrivals"
        mobileHome
        mobileLayout="grid"
      />
      <CategoryTiles mobileHome />
      <ProductShelf
        title="Recommended"
        collection="recommended"
        surface="cream"
        mobileHome
        mobileLayout="carousel"
      />

      <Curated />
    </>
  );
}
