/**
 * Adds the "2JZ Archival T-Shirt" (from 2JZ T-Shirt.docx) as a draft:
 * ₹1,999, Red and Blue in S–2XL, 10 in stock each, with the doc's photos
 * from public/images/products/2jz-archival-tee. Idempotent.
 *
 *   pnpm payload run src/payload/scripts/seed-2jz-tee.ts
 *   pnpm payload run src/payload/scripts/seed-2jz-tee.ts photos
 *
 * `photos` re-uploads the photos, replacing the old ones: run it once the
 * S3_* env vars are set, so they land in Supabase Storage rather than
 * ./media (which the live site can't see).
 */
import path from "node:path";
import { getPayload } from "payload";
import config from "../../payload.config";
import { s3Storage } from "../env";

const payload = await getPayload({ config });

const TITLE = "2JZ Archival T-Shirt";
const HANDLE = "2jz-archival-t-shirt";
const PRICE = 199900; // paise: ₹1,999
const STOCK = 10;
const SIZES = ["S", "M", "L", "XL", "2XL"];
const COLORS = [
  { label: "Red", swatch: "#d42a12" },
  { label: "Blue", swatch: "#1d3fbf" },
];
const PHOTOS = [
  { file: "red-front.png", alt: "2JZ Archival T-Shirt in red, front" },
  { file: "red-side.png", alt: "2JZ Archival T-Shirt in red, side" },
  { file: "red-back.png", alt: "2JZ Archival T-Shirt in red, back graphic" },
  { file: "blue-front.png", alt: "2JZ Archival T-Shirt in blue, front" },
  { file: "blue-back.png", alt: "2JZ Archival T-Shirt in blue, back" },
];

async function variantType(name: string, label: string) {
  const { docs } = await payload.find({
    collection: "variantTypes",
    where: { name: { equals: name } },
    limit: 1,
    depth: 0,
  });
  return (
    docs[0] ??
    (await payload.create({
      collection: "variantTypes",
      data: { name, label },
      depth: 0,
    }))
  );
}

async function option(
  typeId: number,
  label: string,
  swatch?: string,
): Promise<number> {
  const value = label.toLowerCase();
  const { docs } = await payload.find({
    collection: "variantOptions",
    where: {
      and: [{ variantType: { equals: typeId } }, { value: { equals: value } }],
    },
    limit: 1,
    depth: 0,
  });
  if (docs[0]) return docs[0].id;
  const created = await payload.create({
    collection: "variantOptions",
    data: { variantType: typeId, label, value, ...(swatch && { swatch }) },
    depth: 0,
  });
  return created.id;
}

const color = await variantType("color", "Color");
const size = await variantType("size", "Size");
const colorIds = new Map<string, number>();
for (const c of COLORS)
  colorIds.set(c.label, await option(color.id, c.label, c.swatch));
const sizeIds = new Map<string, number>();
for (const s of SIZES) sizeIds.set(s, await option(size.id, s));

const findProduct = async () =>
  (
    await payload.find({
      collection: "products",
      where: { handle: { equals: HANDLE } },
      limit: 1,
      depth: 0,
      draft: true,
    })
  ).docs[0];

let product = await findProduct();
if (product) {
  payload.logger.info(`"${TITLE}" already exists (id ${product.id}).`);
} else {
  product = await payload.create({
    collection: "products",
    data: {
      title: TITLE,
      handle: HANDLE,
      subtitle: "Capsule 01 - Limited Release",
      description:
        "Constructed from a heavy-drape 100% Organic Cotton frame, featuring a clean typographic front print and an architectural full-back graphic.",
      details: [
        "Fabric: 100% Super-Combed Organic Cotton",
        "Structure: Drop-shoulder, boxy streetwear cut, double-stitched reinforced seams",
      ].join("\n"),
      shippingReturns: [
        "Dispatch: Orders are processed and shipped within 2 business days from the order date.",
        "Delivery: Standard delivery timeline is 3 to 5 business days.",
        "Returns & Exchanges: Eligible for return within 3 days of delivery, provided the garment is unworn, unwashed, and retained in its original condition with all tags intact per our return policy.",
      ].join("\n"),
      material: "100% Super-Combed Organic Cotton",
      enableVariants: true,
      variantTypes: [color.id, size.id],
      priceInINREnabled: true,
      priceInINR: PRICE,
      _status: "draft",
    },
    depth: 0,
    draft: true,
  });
  for (const c of COLORS) {
    for (const s of SIZES) {
      await payload.create({
        collection: "variants",
        data: {
          title: `${TITLE} ${c.label} / ${s}`,
          product: product.id,
          options: [colorIds.get(c.label)!, sizeIds.get(s)!],
          inventory: STOCK,
          priceInINREnabled: true,
          priceInINR: PRICE,
          _status: "published",
        },
        depth: 0,
      });
    }
  }
  payload.logger.info(
    `Created "${TITLE}" (id ${product.id}) as a draft with ${COLORS.length * SIZES.length} variants.`,
  );
}

const replacePhotos = process.argv.includes("photos");
if (!product.images?.length || replacePhotos) {
  if (!s3Storage) {
    payload.logger.warn(
      "S3_* env vars aren't set: photos go to ./media and won't show on the live site.",
    );
  }
  const old = [product.thumbnail, ...(product.images ?? [])].flatMap((m) =>
    m == null ? [] : [typeof m === "object" ? m.id : m],
  );
  const ids: number[] = [];
  for (const photo of PHOTOS) {
    const media = await payload.create({
      collection: "media",
      data: { alt: photo.alt },
      filePath: path.resolve(
        "public/images/products/2jz-archival-tee",
        photo.file,
      ),
      depth: 0,
    });
    ids.push(media.id);
  }
  await payload.update({
    collection: "products",
    id: product.id,
    data: { thumbnail: ids[0], images: ids, _status: product._status },
    depth: 0,
  });
  for (const id of new Set(old)) {
    await payload.delete({ collection: "media", id, depth: 0 });
  }
  payload.logger.info(`Added ${ids.length} photos to "${TITLE}".`);
}

await payload.destroy();
process.exit(0);
