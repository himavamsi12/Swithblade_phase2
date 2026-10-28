import type {
  Media,
  Product as PayloadProduct,
  ProductCategory,
  ProductCollection as PayloadCollection,
  Variant,
  VariantOption,
  VariantType,
} from "@/payload-types";
import type {
  Product,
  ProductCollection,
  ProductColor,
  ProductVariant,
} from "./types";

/*
 * Maps a Payload product (fetched with depth 2, so media, categories,
 * variant types and variants' options are populated) to the storefront's
 * product shape.
 */

/** The storefront prices in one currency: the store default. */
export const STORE_CURRENCY = "INR";

const SHELVES: readonly ProductCollection[] = ["new-arrivals", "recommended"];

const isColor = (name: string) => /^colou?rs?$/i.test(name.trim());
const isSize = (name: string) => /^sizes?$/i.test(name.trim());

const populated = <T extends object>(value: number | T | null | undefined) =>
  typeof value === "object" && value !== null ? value : null;

/**
 * Same-site media URLs as paths. Payload makes them absolute from
 * `serverURL`, which next/image would treat as a remote host.
 */
export function mediaPath(url: string | null | undefined, origin?: string) {
  if (!url) return null;
  if (origin && url.startsWith(`${origin}/`)) return url.slice(origin.length);
  return url;
}

function mediaUrl(
  media: number | Media | null | undefined,
  size: "card" | "large",
  origin?: string,
) {
  const m = populated(media);
  return mediaPath(m?.sizes?.[size]?.url || m?.url, origin);
}

/** Stock check shared by variants and variant-less products. */
export function variantAvailable(
  v: Pick<Variant, "inventory" | "manageInventory" | "allowBackorder">,
) {
  return (
    v.manageInventory === false ||
    v.allowBackorder === true ||
    (v.inventory ?? 0) > 0
  );
}

type Options = { color: VariantOption | null; size: VariantOption | null };

function variantOptions(variant: Variant, types: VariantType[]): Options {
  const typeName = (option: VariantOption) => {
    const id =
      typeof option.variantType === "object"
        ? option.variantType.id
        : option.variantType;
    return types.find((t) => t.id === id)?.name ?? "";
  };
  const options = variant.options
    .map((o) => populated(o))
    .filter((o): o is VariantOption => o !== null);
  return {
    color: options.find((o) => isColor(typeName(o))) ?? null,
    size: options.find((o) => isSize(typeName(o))) ?? null,
  };
}

/** Options in the order set in the admin, without repeats. */
function uniqueOptions(options: (VariantOption | null)[]) {
  const seen = new Map<number, VariantOption>();
  for (const o of options) if (o && !seen.has(o.id)) seen.set(o.id, o);
  return [...seen.values()].sort((a, b) =>
    (a._variantOptions_options_order ?? "").localeCompare(
      b._variantOptions_options_order ?? "",
    ),
  );
}

/** The product's variant for a colour/size pick, or null if there's none. */
export function matchVariant(
  doc: PayloadProduct,
  color: string | null,
  size: string | null,
): Variant | null {
  const types = (doc.variantTypes ?? [])
    .map((t) => populated(t))
    .filter((t): t is VariantType => t !== null);
  for (const v of doc.variants?.docs ?? []) {
    const variant = populated(v);
    if (!variant) continue;
    const options = variantOptions(variant, types);
    if (
      (options.color?.label ?? null) === (color || null) &&
      (options.size?.label ?? null) === (size || null)
    ) {
      return variant;
    }
  }
  return null;
}

/** Null when the product can't be sold: no handle or no INR price. */
export function toStorefrontProduct(
  doc: PayloadProduct,
  origin?: string,
): Product | null {
  const price = doc.priceInINREnabled ? doc.priceInINR : null;
  if (!doc.handle || price == null) return null;

  const images = (doc.images ?? [])
    .map((m) => ({ id: populated(m)?.id, url: mediaUrl(m, "large", origin) }))
    .filter((m): m is { id: number; url: string } => Boolean(m.url));
  const gallery = images.map((m) => m.url);
  const main = populated(doc.thumbnail) ?? populated(doc.images?.[0]);
  const image =
    mediaUrl(doc.thumbnail, "card", origin) ??
    mediaUrl(doc.images?.[0], "card", origin);

  const types = (doc.variantTypes ?? [])
    .map((t) => populated(t))
    .filter((t): t is VariantType => t !== null);
  const variantDocs = doc.enableVariants
    ? (doc.variants?.docs ?? [])
        .map((v) => populated(v))
        .filter((v): v is Variant => v !== null)
    : [];
  const withOptions = variantDocs.map((v) => ({
    variant: v,
    ...variantOptions(v, types),
  }));

  const variants: ProductVariant[] = withOptions.map((v) => ({
    id: v.variant.id,
    color: v.color?.label ?? null,
    size: v.size?.label ?? null,
    available: variantAvailable(v.variant),
  }));
  const colors: ProductColor[] = uniqueOptions(
    withOptions.map((v) => v.color),
  ).map((o) => ({ name: o.label, swatch: o.swatch || o.value }));
  const sizes = uniqueOptions(withOptions.map((v) => v.size)).map((o) => ({
    label: o.label,
    available: variants.some((v) => v.size === o.label && v.available),
  }));

  const collection = populated(doc.collection) as PayloadCollection | null;
  const category = populated(doc.categories?.[0]) as ProductCategory | null;
  const frame = doc.imageFrame;
  const hasFrame =
    frame?.left != null &&
    frame.top != null &&
    frame.width != null &&
    frame.height != null;

  return {
    id: String(doc.id),
    slug: doc.handle,
    name: doc.title,
    description: doc.description ?? "",
    price,
    currency: STORE_CURRENCY,
    image,
    // First gallery photo that isn't the main one, e.g. a model shot.
    hoverImage: images.find((m) => m.id !== main?.id)?.url ?? null,
    inStock: doc.enableVariants
      ? variants.some((v) => v.available)
      : variantAvailable({ inventory: doc.inventory }),
    category: category?.handle ?? undefined,
    colorCount: colors.length || undefined,
    collections: SHELVES.filter((s) => s === collection?.handle),
    highlighted: doc.highlighted ?? false,
    imageFrame: hasFrame
      ? {
          left: frame.left!,
          top: frame.top!,
          width: frame.width!,
          height: frame.height!,
        }
      : undefined,
    gallery: gallery.length > 0 ? gallery : image ? [image] : [],
    colors,
    sizes,
    details: doc.details ?? "",
    shippingReturns: doc.shippingReturns ?? "",
    ...(doc.enableVariants ? { variants } : {}),
  };
}
