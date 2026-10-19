import Image from "next/image";
import clothImg from "@/assets/footer-img/cloth-img.png";
import productImg from "@/assets/footer-img/product-img.png";

/** Editorial split: large lookbook photo on the left, short manifesto on the right. */
export function Curated() {
  return (
    <section
      aria-labelledby="curated-heading"
      className="mx-auto grid w-full max-w-480 items-center gap-10 pt-12 pb-20 md:grid-cols-2 md:gap-0 md:pt-20 md:pb-40"
    >
      <div className="px-4 md:pr-0 md:pl-10">
        <Image
          src={productImg}
          alt="Model in an olive zip-neck sweatshirt and mirrored sunglasses"
          sizes="(min-width: 768px) 50vw, 100vw"
          placeholder="blur"
          className="h-auto w-full"
        />
      </div>

      <div className="flex justify-center px-4 md:px-0">
        <div className="flex w-full max-w-[270px] flex-col gap-4">
          <h2
            id="curated-heading"
            className="text-h5 whitespace-nowrap uppercase"
          >
            Curated, not collected
          </h2>
          <Image
            src={clothImg}
            alt="Close-up of olive cotton fabric"
            width={270}
            height={378}
            sizes="270px"
            placeholder="blur"
            className="h-auto w-full"
          />
          <p className="mt-2 text-body-2 uppercase">
            Fewer pieces. Higher standard. Nothing arbitrary.
          </p>
        </div>
      </div>
    </section>
  );
}
