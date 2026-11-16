/**
 * One-off: adds the first Switchblade drop (8 designs, 12 colourways) to New
 * Arrivals, with every colour × size in stock and photos per colour, and
 * moves the demo/test products into a "Demo Products" shelf. Idempotent:
 * products that already exist (by handle) are left alone.
 *
 *   PRODUCT_PHOTOS=/path/to/jpgs pnpm payload run src/payload/scripts/seed-new-arrivals.ts
 *
 * PRODUCT_PHOTOS holds `<design>.<colour>_<view>.jpg` files (e.g.
 * `1.1_front.jpg`). Names, prices and stock are starting values; edit them
 * in /admin.
 */
import fs from "node:fs";
import path from "node:path";
import { getPayload } from "payload";
import config from "../../payload.config";

const payload = await getPayload({ config });

const photosDir = process.env.PRODUCT_PHOTOS;
if (!photosDir || !fs.existsSync(photosDir)) {
  throw new Error("Set PRODUCT_PHOTOS to the folder of product photos.");
}

const SIZES = ["S", "M", "L", "XL", "2XL"];
const STOCK_PER_SIZE = 20;

const COLORS: Record<string, string> = {
  Black: "#111111",
  White: "#f4f4f2",
  Green: "#1f6b34",
  Blue: "#1d3fbf",
};

type Design = {
  handle: string;
  title: string;
  subtitle: string;
  description: string;
  /** Paise. */
  price: number;
  /** Colour name → photo file names, main photo first. */
  colors: [string, string[]][];
};

const views = (prefix: string, names = ["front", "back", "side"]) =>
  names.map((v) => `${prefix}_${v}.jpg`);

const DESIGNS: Design[] = [
  {
    handle: "star-tee",
    title: "Star Tee",
    subtitle: "Capsule 01",
    description:
      "Chrome Switchblade wordmark on the chest and an oversized ice-star graphic across the back.",
    price: 199900,
    colors: [
      ["Black", views("1.1")],
      ["White", views("1.2")],
    ],
  },
  {
    handle: "switchblade-logo-tee",
    title: "Switchblade Logo Tee",
    subtitle: "Capsule 01",
    description:
      "Switchblade logo across the chest and sleeve, with a full-length mechanical arm graphic on the back.",
    price: 199900,
    colors: [
      ["Black", views("2.1")],
      ["Green", views("2.2")],
    ],
  },
  {
    handle: "le-monde-tee",
    title: "Le Monde Tee",
    subtitle: "Capsule 01",
    description:
      'Photo print on the chest and a "Le Monde est à Vous" globe graphic on the back.',
    price: 199900,
    colors: [
      ["Blue", views("3.1", ["front", "back"])],
      ["White", views("3.2", ["front", "back"])],
    ],
  },
  {
    handle: "trust-the-vision-tee",
    title: "Trust The Vision Tee",
    subtitle: "Capsule 01",
    description:
      'INAT. on the chest and "Trust the vision, hold the vision, chase the vision" across the back.',
    price: 199900,
    colors: [
      ["Green", views("4.1", ["front", "back"])],
      ["White", views("4.2", ["front", "back"])],
    ],
  },
  {
    handle: "striped-long-sleeve-tee",
    title: "Striped Long Sleeve Tee",
    subtitle: "Capsule 01",
    description:
      "Long-sleeve tee with blue sleeves and a chest stripe, Switchblade wordmark on the front.",
    price: 249900,
    colors: [["Blue", views("5", ["front", "back"])]],
  },
  {
    handle: "graphic-long-sleeve-tee",
    title: "Graphic Long Sleeve Tee",
    subtitle: "Capsule 01",
    description:
      "Long-sleeve tee with a contrast blue sleeve and an abstract black-and-blue graphic.",
    price: 249900,
    colors: [["White", views("6", ["front", "back"])]],
  },
  {
    handle: "zip-fleece-jacket",
    title: "Zip Fleece Jacket",
    subtitle: "Capsule 01",
    description:
      "Full-zip fleece jacket with contrast orange zips and stitching, and a chest pocket.",
    price: 399900,
    colors: [["Blue", views("7")]],
  },
  {
    handle: "flame-cat-hoodie",
    title: "Flame Cat Hoodie",
    subtitle: "Capsule 01",
    description:
      "Heavyweight hoodie with a flaming Switchblade wordmark on the chest and a flame-cat graphic on the back.",
    price: 349900,
    colors: [
      ["Blue", ["8_front_1.jpg", "8_back_1.jpg"]],
      ["Black", ["8_front_2.jpg", "8_back_2.jpg"]],
    ],
  },
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

async function option(typeId: number, label: string, swatch?: string) {
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

async function shelf(handle: string, title: string) {
  const { docs } = await payload.find({
    collection: "product-collections",
    where: { handle: { equals: handle } },
    limit: 1,
    depth: 0,
  });
  return (
    docs[0] ??
    (await payload.create({
      collection: "product-collections",
      data: { title, handle },
      depth: 0,
    }))
  ).id;
}

const color = await variantType("color", "Color");
const size = await variantType("size", "Size");
const colorIds = new Map<string, number>();
for (const [label, swatch] of Object.entries(COLORS)) {
  colorIds.set(label, await option(color.id, label, swatch));
}
const sizeIds = new Map<string, number>();
for (const s of SIZES) sizeIds.set(s, await option(size.id, s));

const newArrivals = await shelf("new-arrivals", "New Arrivals");
const demoShelf = await shelf("demo-products", "Demo Products");

// Check every photo exists before writing anything.
for (const d of DESIGNS) {
  for (const [, files] of d.colors) {
    for (const f of files) {
      if (!fs.existsSync(path.join(photosDir, f))) {
        throw new Error(`Missing photo ${f} for ${d.title}`);
      }
    }
  }
}

// The shipping and returns copy staff wrote for the first product.
const template = (
  await payload.find({
    collection: "products",
    where: { handle: { equals: "2jz-archival-t-shirt" } },
    limit: 1,
    depth: 0,
  })
).docs[0];

for (const d of DESIGNS) {
  const existing = await payload.find({
    collection: "products",
    where: { handle: { equals: d.handle } },
    limit: 1,
    depth: 0,
    draft: true,
  });
  if (existing.docs[0]) {
    payload.logger.info(`"${d.title}" already exists; skipped.`);
    continue;
  }

  const colorImages: { color: number; images: number[] }[] = [];
  for (const [name, files] of d.colors) {
    const ids: number[] = [];
    for (const [i, file] of files.entries()) {
      const view = file.match(/_(front|back|side)/)?.[1] ?? `photo ${i + 1}`;
      const media = await payload.create({
        collection: "media",
        data: { alt: `${d.title} in ${name.toLowerCase()}, ${view}` },
        filePath: path.join(photosDir, file),
        depth: 0,
      });
      ids.push(media.id);
    }
    colorImages.push({ color: colorIds.get(name)!, images: ids });
  }
  const images = colorImages.flatMap((c) => c.images);

  const product = await payload.create({
    collection: "products",
    data: {
      title: d.title,
      handle: d.handle,
      subtitle: d.subtitle,
      description: d.description,
      enableVariants: true,
      variantTypes: [color.id, size.id],
      priceInINREnabled: true,
      priceInINR: d.price,
      discountable: true,
      highlighted: false,
      collection: newArrivals,
      shippingReturns: template?.shippingReturns ?? undefined,
      thumbnail: images[0],
      images,
      colorImages,
      _status: "draft",
    },
    depth: 0,
    draft: true,
  });

  for (const [name] of d.colors) {
    for (const s of SIZES) {
      await payload.create({
        collection: "variants",
        data: {
          title: `${d.title} ${name} / ${s}`,
          product: product.id,
          options: [colorIds.get(name)!, sizeIds.get(s)!],
          inventory: STOCK_PER_SIZE,
          priceInINREnabled: true,
          priceInINR: d.price,
          _status: "published",
        },
        depth: 0,
      });
    }
  }

  // Published last, so the shop never shows it half-made.
  await payload.update({
    collection: "products",
    id: product.id,
    data: { _status: "published" },
    depth: 0,
  });
  payload.logger.info(
    `Added "${d.title}": ${d.colors.length} colour(s) × ${SIZES.length} sizes, ${images.length} photos.`,
  );
}

// Demo and test products move off New Arrivals to their own shelf.
for (const handle of ["test-tee", "demo-dark-denium", "demo-shirt"]) {
  const { docs } = await payload.find({
    collection: "products",
    where: { handle: { equals: handle } },
    limit: 1,
    depth: 0,
  });
  const doc = docs[0];
  if (!doc) continue;
  const current =
    typeof doc.collection === "object" ? doc.collection?.id : doc.collection;
  if (current === demoShelf) continue;
  await payload.update({
    collection: "products",
    id: doc.id,
    data: { collection: demoShelf },
    depth: 0,
  });
  payload.logger.info(`Moved "${doc.title}" to Demo Products.`);
}

await payload.destroy();
process.exit(0);
