import { ArrowRight } from "lucide-react";
import type { Metadata } from "next";
import Image from "next/image";
import heartIcon from "@/assets/promise/favorite.svg";
import tagIcon from "@/assets/promise/tag.svg";
import { YouMayAlsoLike } from "@/features/catalog/components/you-may-also-like";
import { listPromiseProducts } from "@/features/catalog/repository";

const intro =
  "Switchblade promise pieces are inspired by events close to our values, and the earnings from each promise piece go directly to the cause that inspired it.";

export const metadata: Metadata = {
  title: "Promises",
  description: intro,
};

const steps = [
  {
    number: "01",
    icon: tagIcon,
    title: "You choose a promise piece",
    text: "Marked clearly in the shop — the badge means the piece participates in this initiative.",
  },
  {
    number: "02",
    icon: heartIcon,
    title: "We donate it, and show you where",
    text: "We pass on the earnings to the cause through officially registered foundations that help the cause.",
  },
];

export default async function PromisesPage() {
  const products = await listPromiseProducts(8);

  return (
    <div className="mx-auto w-full max-w-480 px-4 pb-24 md:px-12 md:pb-40">
      <header className="flex flex-col items-center gap-4 pt-12 text-center md:pt-20">
        <h1 className="max-w-[640px] text-h1 leading-[1.05] font-semibold uppercase">
          % of every promise given forward
        </h1>
        <p className="max-w-[540px] text-body-3">{intro}</p>
      </header>

      <ol className="mx-auto mt-16 flex max-w-[820px] flex-col items-center gap-4 md:mt-[108px] md:flex-row md:items-stretch md:justify-center md:gap-4">
        {steps.map((step, i) => (
          <li key={step.number} className="contents">
            {i > 0 && (
              <span
                aria-hidden
                className="flex size-[52px] shrink-0 items-center justify-center self-center rounded-md border border-stroke"
              >
                <ArrowRight
                  size={18}
                  strokeWidth={1.5}
                  className="rotate-90 md:rotate-0"
                />
              </span>
            )}
            <article className="flex w-full max-w-[358px] flex-col rounded-md border border-stroke p-4 md:p-5">
              <span className="w-fit rounded-md border border-stroke px-2 py-0.5 text-body-4 tabular-nums">
                {step.number}
              </span>
              <Image
                src={step.icon}
                alt=""
                className="mx-auto mt-5 size-[150px]"
              />
              <h2 className="mt-12 text-h5 leading-tight font-semibold uppercase">
                {step.title}
              </h2>
              <p className="mt-3 text-body-2 text-black/80">{step.text}</p>
            </article>
          </li>
        ))}
      </ol>

      <YouMayAlsoLike
        title="Shop the promise"
        products={products}
        className="pt-20 md:pt-[120px]"
      />
    </div>
  );
}
