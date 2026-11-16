import type { StaticImageData } from "next/image";
import l510 from "@/assets/size-guide/tee/l-5-10.webp";
import l58 from "@/assets/size-guide/tee/l-5-8.webp";
import l60 from "@/assets/size-guide/tee/l-6-0.webp";
import l62 from "@/assets/size-guide/tee/l-6-2.webp";
import m510 from "@/assets/size-guide/tee/m-5-10.webp";
import m58 from "@/assets/size-guide/tee/m-5-8.webp";
import m60 from "@/assets/size-guide/tee/m-6-0.webp";
import m62 from "@/assets/size-guide/tee/m-6-2.webp";
import s510 from "@/assets/size-guide/tee/s-5-10.webp";
import s58 from "@/assets/size-guide/tee/s-5-8.webp";
import s60 from "@/assets/size-guide/tee/s-6-0.webp";
import s62 from "@/assets/size-guide/tee/s-6-2.webp";
import xl510 from "@/assets/size-guide/tee/xl-5-10.webp";
import xl58 from "@/assets/size-guide/tee/xl-5-8.webp";
import xl60 from "@/assets/size-guide/tee/xl-6-0.webp";
import xl62 from "@/assets/size-guide/tee/xl-6-2.webp";
import type { PreviewHeight, PreviewSize } from "./size-guide";

/**
 * Fit renders of the tee on a mannequin, by size and height.
 * TEMPORARY: one set for every product until each product has its own.
 */
export const fitPreviewImages: Record<
  PreviewSize,
  Record<PreviewHeight["key"], StaticImageData>
> = {
  S: { "5-8": s58, "5-10": s510, "6-0": s60, "6-2": s62 },
  M: { "5-8": m58, "5-10": m510, "6-0": m60, "6-2": m62 },
  L: { "5-8": l58, "5-10": l510, "6-0": l60, "6-2": l62 },
  XL: { "5-8": xl58, "5-10": xl510, "6-0": xl60, "6-2": xl62 },
};
