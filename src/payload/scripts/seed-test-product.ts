/**
 * One-off: creates the Color and Size option types (from the design) and a
 * "Test Tee" at ₹1 with every colour × size, 1 in stock each, for Razorpay
 * test payments, with sample photos. Idempotent. Delete the product before
 * launch.
 *
 *   pnpm payload run src/payload/scripts/seed-test-product.ts
 */
import path from "node:path";
import { getPayload } from "payload";
import config from "../../payload.config";

const payload = await getPayload({ config });

const COLORS = [
  { label: "Maroon", swatch: "#4b1f1f" },
  { label: "Cream", swatch: "#e8e0d3" },
  { label: "Olive", swatch: "#5d6b3d" },
];
const SIZES = ["XS", "S", "M", "L", "XL", "2XL"];
const PRICE = 100; // paise: ₹1, Razorpay's minimum
const HANDLE = "test-tee";

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

const existing = await payload.find({
  collection: "products",
  where: { handle: { equals: HANDLE } },
  limit: 1,
  depth: 0,
  draft: true,
});
if (existing.docs[0]) {
  payload.logger.info(
    `"${HANDLE}" already exists (id ${existing.docs[0].id}); nothing to do.`,
  );
} else {
  const product = await payload.create({
    collection: "products",
    data: {
      title: "Test Tee",
      handle: HANDLE,
      subtitle: "Test product, delete before launch",
      description: "For Razorpay test payments and stock-hold checks.",
      enableVariants: true,
      variantTypes: [color.id, size.id],
      priceInINREnabled: true,
      priceInINR: PRICE,
      discountable: false,
      highlighted: false,
      _status: "published",
    },
    depth: 0,
  });
  for (const c of COLORS) {
    for (const s of SIZES) {
      await payload.create({
        collection: "variants",
        data: {
          title: `Test Tee ${c.label} / ${s}`,
          product: product.id,
          options: [colorIds.get(c.label)!, sizeIds.get(s)!],
          inventory: 1,
          priceInINREnabled: true,
          priceInINR: PRICE,
          _status: "published",
        },
        depth: 0,
      });
    }
  }
  payload.logger.info(
    `Created "Test Tee" (id ${product.id}) with ${COLORS.length * SIZES.length} variants.`,
  );
}

// Sample photos from the design, as the product's thumbnail and gallery.
// Uploads to Supabase Storage when the S3_* env vars are set, else to ./media.
const testTee = (
  await payload.find({
    collection: "products",
    where: { handle: { equals: HANDLE } },
    limit: 1,
    depth: 0,
    draft: true,
  })
).docs[0];
if (testTee && !testTee.images?.length) {
  const ids: number[] = [];
  for (const n of [1, 2, 3, 4, 5, 6]) {
    const media = await payload.create({
      collection: "media",
      data: { alt: `Test Tee, photo ${n}` },
      filePath: path.resolve(`public/images/products/detail/${n}.png`),
      depth: 0,
    });
    ids.push(media.id);
  }
  await payload.update({
    collection: "products",
    id: testTee.id,
    data: { thumbnail: ids[0], images: ids, _status: "published" },
    depth: 0,
  });
  payload.logger.info(`Added ${ids.length} photos to "Test Tee".`);
}

await payload.destroy();
process.exit(0);
