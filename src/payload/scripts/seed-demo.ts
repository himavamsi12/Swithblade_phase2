/**
 * Sample data for showing the admin to the client: a few clearly labelled
 * "[DEMO]" records in every sidebar section (except Users and Store), linked
 * together so orders, returns and payments look real.
 *
 *   pnpm seed:demo           add the demo records
 *   pnpm seed:demo:remove    delete them again, and nothing else
 *
 * Safe on a live database: demo products are drafts, so the storefront never
 * shows them; demo orders are tagged so the order retry job never sends them
 * to Shiprocket or emails anyone; customers use @example.com addresses.
 * Run `pnpm migrate` first.
 */
import path from "node:path";
import { getPayload, type CollectionSlug, type Payload } from "payload";
import config from "../../payload.config";
import { DEMO_METADATA, isDemo } from "../demo";

const payload = await getPayload({ config });
const remove = process.argv.includes("remove");

const metadata = DEMO_METADATA;
const DEMO_EMAIL_DOMAIN = "@example.com";
const DEMO_CHECKOUT_PREFIX = "demo-";
const DEMO_ALT_PREFIX = "[DEMO]";

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY).toISOString();
const daysFromNow = (n: number) => new Date(Date.now() + n * DAY).toISOString();
const rupees = (n: number) => n * 100; // money is stored in paise

/** Every collection the script writes, children before what they point at. */
const REMOVAL_ORDER: CollectionSlug[] = [
  "returns",
  "transactions",
  "orders",
  "carts",
  "stock-holds",
  "price-lists",
  "promotions",
  "campaigns",
  "variants",
  "products",
  "media",
  "customers",
  "customer-groups",
  "shipping-options",
  "shipping-profiles",
  "stock-locations",
  "tax-regions",
  "regions",
  "sales-channels",
  "return-reasons",
  "product-types",
  "product-tags",
  "product-categories",
  "product-collections",
];

/** Collections without a metadata field are recognised by other markers. */
function isDemoDoc(
  collection: CollectionSlug,
  doc: Record<string, unknown>,
  demoCustomers: Set<number>,
): boolean {
  switch (collection) {
    case "media":
      return String(doc.alt ?? "").startsWith(DEMO_ALT_PREFIX);
    case "stock-holds":
      return String(doc.checkout ?? "").startsWith(DEMO_CHECKOUT_PREFIX);
    case "transactions":
      return String(doc.customerEmail ?? "").endsWith(DEMO_EMAIL_DOMAIN);
    case "carts":
      return (
        typeof doc.customer === "number" && demoCustomers.has(doc.customer)
      );
    default:
      return isDemo(doc.metadata);
  }
}

async function allDocs(payload: Payload, collection: CollectionSlug) {
  const { docs } = await payload.find({
    collection,
    pagination: false,
    depth: 0,
    draft: true,
    trash: true,
  });
  return docs as unknown as Record<string, unknown>[];
}

async function removeDemo() {
  const customers = await allDocs(payload, "customers");
  const demoCustomers = new Set(
    customers.filter((c) => isDemo(c.metadata)).map((c) => c.id as number),
  );
  for (const collection of REMOVAL_ORDER) {
    const docs = (await allDocs(payload, collection)).filter((doc) =>
      isDemoDoc(collection, doc, demoCustomers),
    );
    for (const doc of docs) {
      await payload.delete({
        collection,
        id: doc.id as number,
        depth: 0,
        trash: false,
      });
    }
    if (docs.length)
      payload.logger.info(`Removed ${docs.length} ${collection}`);
  }
  payload.logger.info("Demo data removed.");
}

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
  ).id;
}

/** Colour and size values are real catalogue setup: reused, never removed. */
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
  return (
    await payload.create({
      collection: "variantOptions",
      data: { variantType: typeId, label, value, ...(swatch && { swatch }) },
      depth: 0,
    })
  ).id;
}

async function seedDemo() {
  const existing = (await allDocs(payload, "products")).some((p) =>
    isDemo(p.metadata),
  );
  if (existing) {
    payload.logger.info(
      "Demo data is already there. Run `pnpm seed:demo:remove` first to start over.",
    );
    return;
  }

  // Settings
  const region = await payload.create({
    collection: "regions",
    data: {
      name: "[DEMO] India",
      currency: "INR",
      countries: ["IN"],
      isTaxInclusive: true,
      metadata,
    },
  });
  await payload.create({
    collection: "tax-regions",
    data: {
      country: "IN",
      province: "Telangana",
      defaultRate: { name: "[DEMO] GST on apparel", code: "GST12", rate: 12 },
      metadata,
    },
  });
  const channel = await payload.create({
    collection: "sales-channels",
    data: { name: "[DEMO] Instagram shop", metadata },
  });
  const wrongSize = await payload.create({
    collection: "return-reasons",
    data: { value: "demo-wrong-size", label: "[DEMO] Wrong size", metadata },
  });
  await payload.create({
    collection: "return-reasons",
    data: { value: "demo-damaged", label: "[DEMO] Arrived damaged", metadata },
  });
  const location = await payload.create({
    collection: "stock-locations",
    data: {
      name: "[DEMO] Hyderabad warehouse",
      address: {
        address1: "Plot 12, Jubilee Hills",
        city: "Hyderabad",
        province: "Telangana",
        postalCode: "500033",
        country: "IN",
      },
      supportsShipping: true,
      serviceZones: [{ name: "India", countries: ["IN"] }],
      metadata,
    },
  });
  const profile = await payload.create({
    collection: "shipping-profiles",
    data: { name: "[DEMO] Standard apparel", type: "default", metadata },
  });
  await payload.create({
    collection: "shipping-options",
    data: {
      name: "[DEMO] Standard delivery (3–7 days)",
      stockLocation: location.id,
      serviceZone: "India",
      shippingProfile: profile.id,
      priceType: "flat",
      prices: [{ currency: "INR", amount: 0 }],
      enabled: true,
      metadata,
    },
  });

  // Catalogue setup
  const type = await payload.create({
    collection: "product-types",
    data: { value: "[DEMO] Outerwear", metadata },
  });
  const tag = await payload.create({
    collection: "product-tags",
    data: { value: "[DEMO] Bestseller", metadata },
  });
  const tops = await payload.create({
    collection: "product-categories",
    data: { name: "[DEMO] Tops", rank: 1, isActive: true, metadata },
  });
  const vests = await payload.create({
    collection: "product-categories",
    data: {
      name: "[DEMO] Vests",
      parent: tops.id,
      rank: 2,
      isActive: true,
      metadata,
    },
  });
  const collection = await payload.create({
    collection: "product-collections",
    data: { title: "[DEMO] Summer Edit", handle: "demo-summer-edit", metadata },
  });

  const color = await variantType("color", "Color");
  const size = await variantType("size", "Size");
  const maroon = await option(color, "Maroon", "#4b1f1f");
  const olive = await option(color, "Olive", "#5d6b3d");
  const cream = await option(color, "Cream", "#e8e0d3");
  const sizes = Object.fromEntries(
    await Promise.all(
      ["XS", "S", "M", "L"].map(async (s) => [s, await option(size, s)]),
    ),
  ) as Record<string, number>;

  // Media
  const photo = async (file: string, alt: string) =>
    (
      await payload.create({
        collection: "media",
        data: { alt: `${DEMO_ALT_PREFIX} ${alt}` },
        filePath: path.resolve(file),
        depth: 0,
      })
    ).id;
  const vestPhotos = [
    await photo(
      "public/images/products/new-arrivals/arrival-1.png",
      "Fleece vest, front",
    ),
    await photo("public/images/products/detail/2.png", "Fleece vest, on model"),
  ];
  const blousePhotos = [
    await photo(
      "public/images/products/new-arrivals/arrival-2.png",
      "Checkered blouse, front",
    ),
    await photo(
      "public/images/products/detail/3.png",
      "Checkered blouse, on model",
    ),
  ];
  const shirtPhoto = await photo(
    "public/images/products/new-arrivals/arrival-3.png",
    "Denim zip shirt, front",
  );

  // Products (drafts: never on the storefront)
  const product = (data: Record<string, unknown>) =>
    payload.create({
      collection: "products",
      data: {
        _status: "draft",
        priceInINREnabled: true,
        collection: collection.id,
        type: type.id,
        tags: [tag.id],
        details:
          "Relaxed fit. 100% cotton fleece. Machine wash cold, dry flat.",
        shippingReturns:
          "Free delivery in 3–7 business days. Returns within 7 days of delivery.",
        metadata,
        ...data,
      } as never,
      depth: 0,
      draft: true,
    });

  const vest = await product({
    title: "[DEMO] Blocked Fleece Vest",
    handle: "demo-blocked-fleece-vest",
    subtitle: "Colour-blocked fleece vest",
    description: "A cropped fleece vest with contrast panels.",
    priceInINR: rupees(2500),
    thumbnail: vestPhotos[0],
    images: vestPhotos,
    categories: [tops.id, vests.id],
    enableVariants: true,
    variantTypes: [color, size],
    highlighted: true,
  });
  const blouse = await product({
    title: "[DEMO] Pink Checkered Blouse",
    handle: "demo-pink-checkered-blouse",
    description: "A short-sleeve blouse in a soft checkered weave.",
    priceInINR: rupees(2450),
    thumbnail: blousePhotos[0],
    images: blousePhotos,
    categories: [tops.id],
    enableVariants: true,
    variantTypes: [color, size],
  });
  const shirt = await product({
    title: "[DEMO] Denim Zip Shirt",
    handle: "demo-denim-zip-shirt",
    description: "A fitted denim shirt with a full-length zip.",
    priceInINR: rupees(2990),
    thumbnail: shirtPhoto,
    images: [shirtPhoto],
    categories: [tops.id],
    enableVariants: false,
    inventory: 3, // shows up as low stock on the dashboard
  });

  const variant = async (
    productId: number,
    title: string,
    options: number[],
    inventory: number,
    price: number,
  ) =>
    (
      await payload.create({
        collection: "variants",
        data: {
          title,
          product: productId,
          options,
          inventory,
          priceInINREnabled: true,
          priceInINR: price,
          sku: `DEMO-${title.replace(/\W+/g, "-").toUpperCase()}`,
          manageInventory: true,
          _status: "published",
          metadata,
        },
        depth: 0,
      })
    ).id;
  const vestMaroonXS = await variant(
    vest.id,
    "Fleece Vest Maroon / XS",
    [maroon, sizes.XS],
    12,
    rupees(2500),
  );
  await variant(
    vest.id,
    "Fleece Vest Maroon / S",
    [maroon, sizes.S],
    8,
    rupees(2500),
  );
  await variant(
    vest.id,
    "Fleece Vest Maroon / M",
    [maroon, sizes.M],
    0,
    rupees(2500),
  );
  const vestOliveS = await variant(
    vest.id,
    "Fleece Vest Olive / S",
    [olive, sizes.S],
    4,
    rupees(2500),
  );
  await variant(
    vest.id,
    "Fleece Vest Olive / M",
    [olive, sizes.M],
    10,
    rupees(2500),
  );
  const blouseCreamM = await variant(
    blouse.id,
    "Checkered Blouse Cream / M",
    [cream, sizes.M],
    6,
    rupees(2450),
  );
  await variant(
    blouse.id,
    "Checkered Blouse Cream / L",
    [cream, sizes.L],
    2,
    rupees(2450),
  );

  // Customers
  const vip = await payload.create({
    collection: "customer-groups",
    data: { name: "[DEMO] VIP", metadata },
  });
  const customer = (
    firstName: string,
    lastName: string,
    phone: string,
    groups: number[] = [],
  ) =>
    payload.create({
      collection: "customers",
      data: {
        email: `${firstName}.${lastName}`.toLowerCase() + DEMO_EMAIL_DOMAIN,
        firstName,
        lastName,
        phone,
        groups,
        metadata,
      },
    });
  const aarav = await customer("Aarav", "Sharma", "+91 98765 43210", [vip.id]);
  const diya = await customer("Diya", "Reddy", "+91 91234 56780");
  const kabir = await customer("Kabir", "Mehta", "+91 99887 76655");

  const address = (
    c: {
      firstName?: string | null;
      lastName?: string | null;
      phone?: string | null;
    },
    line1: string,
    city: string,
    state: string,
    postalCode: string,
  ) => ({
    firstName: c.firstName,
    lastName: c.lastName,
    addressLine1: line1,
    city,
    state,
    postalCode,
    country: "IN",
    phone: c.phone,
  });

  // Orders, each with its payment record. Marked as already sent to
  // Shiprocket and emailed, on top of the demo tag the retry job checks.
  const orderMetadata = {
    ...metadata,
    shiprocket: { orderId: "DEMO" },
    notifications: { orderPlaced: { email: { sentAt: daysAgo(0) } } },
  };
  type Line = {
    title: string;
    options: string;
    slug: string;
    price: number;
    productId: number;
    variantId?: number;
    image: string;
  };
  const vestLine = (opts: string, variantId: number): Line => ({
    title: "[DEMO] Blocked Fleece Vest",
    options: opts,
    slug: "demo-blocked-fleece-vest",
    price: rupees(2500),
    productId: vest.id,
    variantId,
    image: "/images/products/new-arrivals/arrival-1.png",
  });
  const blouseLine: Line = {
    title: "[DEMO] Pink Checkered Blouse",
    options: "Cream · Size M",
    slug: "demo-pink-checkered-blouse",
    price: rupees(2450),
    productId: blouse.id,
    variantId: blouseCreamM,
    image: "/images/products/new-arrivals/arrival-2.png",
  };
  const shirtLine: Line = {
    title: "[DEMO] Denim Zip Shirt",
    options: "",
    slug: "demo-denim-zip-shirt",
    price: rupees(2990),
    productId: shirt.id,
    image: "/images/products/new-arrivals/arrival-3.png",
  };

  const order = async ({
    n,
    who,
    ship,
    lines,
    fulfillmentStatus,
    paymentStatus,
    status,
    placed,
    fulfillment,
    expected,
    note,
  }: {
    n: number;
    who: typeof aarav;
    ship: ReturnType<typeof address>;
    lines: Line[];
    fulfillmentStatus:
      "not_fulfilled" | "fulfilled" | "shipped" | "delivered" | "canceled";
    paymentStatus: "captured" | "refunded";
    status: "processing" | "completed" | "cancelled" | "refunded";
    placed: number;
    fulfillment?: { shippedAt: string; deliveredAt?: string };
    expected?: string;
    note?: string;
  }) => {
    const amount = lines.reduce((sum, l) => sum + l.price, 0);
    const created = await payload.create({
      collection: "orders",
      data: {
        customer: who.id,
        customerEmail: who.email,
        shippingAddress: ship,
        items: lines.map((l) => ({
          product: l.productId,
          variant: l.variantId,
          quantity: 1,
        })),
        lineItems: lines.map((l) => ({
          title: l.title,
          options: l.options || undefined,
          productSlug: l.slug,
          unitPrice: l.price,
          quantity: 1,
          image: l.image,
        })),
        amount,
        currency: "INR",
        totals: {
          subtotal: amount,
          discountTotal: 0,
          shippingTotal: 0,
          taxTotal: 0,
        },
        shippingMethod: { name: "Standard Delivery", amount: 0 },
        status,
        paymentStatus,
        fulfillmentStatus,
        razorpayOrderId: `order_DEMO${n}`,
        razorpayPaymentId: `pay_DEMO${n}`,
        region: region.id,
        salesChannel: channel.id,
        expectedDeliveryAt: expected,
        fulfillments: fulfillment
          ? [
              {
                location: location.id,
                carrier: "Delhivery",
                trackingNumber: `DEMO10000${n}`,
                trackingUrl: `https://www.delhivery.com/track/package/DEMO10000${n}`,
                ...fulfillment,
              },
            ]
          : [],
        note,
        metadata: orderMetadata,
        createdAt: daysAgo(placed),
      } as never,
      depth: 0,
    });
    await payload.create({
      collection: "transactions",
      data: {
        status: paymentStatus === "refunded" ? "refunded" : "succeeded",
        customer: who.id,
        customerEmail: who.email,
        order: created.id,
        amount,
        currency: "INR",
        items: lines.map((l) => ({
          product: l.productId,
          variant: l.variantId,
          quantity: 1,
        })),
        billingAddress: ship,
        createdAt: daysAgo(placed),
      },
      depth: 0,
    });
    payload.logger.info(`Created demo order ${n} (placed ${placed} days ago)`);
    return created;
  };

  const aaravHome = address(
    aarav,
    "21 Road No. 36, Jubilee Hills",
    "Hyderabad",
    "Telangana",
    "500033",
  );
  const diyaHome = address(
    diya,
    "4th Cross, Indiranagar",
    "Bengaluru",
    "Karnataka",
    "560038",
  );
  const kabirHome = address(
    kabir,
    "Flat 7B, Bandra West",
    "Mumbai",
    "Maharashtra",
    "400050",
  );

  const delivered = await order({
    n: 1,
    who: aarav,
    ship: aaravHome,
    lines: [
      vestLine("Maroon · Size XS", vestMaroonXS),
      vestLine("Olive · Size S", vestOliveS),
    ],
    fulfillmentStatus: "delivered",
    paymentStatus: "captured",
    status: "completed",
    placed: 12,
    fulfillment: { shippedAt: daysAgo(10), deliveredAt: daysAgo(7) },
    expected: daysAgo(7),
  });
  await order({
    n: 2,
    who: diya,
    ship: diyaHome,
    lines: [blouseLine],
    fulfillmentStatus: "shipped",
    paymentStatus: "captured",
    status: "processing",
    placed: 3,
    fulfillment: { shippedAt: daysAgo(1) },
    expected: daysFromNow(3),
  });
  await order({
    n: 3,
    who: kabir,
    ship: kabirHome,
    lines: [shirtLine, blouseLine],
    fulfillmentStatus: "not_fulfilled",
    paymentStatus: "captured",
    status: "processing",
    placed: 1,
    expected: daysFromNow(6),
    note: "[DEMO] Customer asked for gift wrapping.",
  });
  await order({
    n: 4,
    who: aarav,
    ship: aaravHome,
    lines: [shirtLine],
    fulfillmentStatus: "canceled",
    paymentStatus: "refunded",
    status: "refunded",
    placed: 20,
    note: "[DEMO] Cancelled at the customer's request before dispatch; refunded in Razorpay.",
  });

  // Return on the delivered order
  await payload.create({
    collection: "returns",
    data: {
      order: delivered.id,
      status: "requested",
      items: [
        {
          product: vest.id,
          variant: vestMaroonXS,
          quantity: 1,
          reason: wrongSize.id,
          note: "Too small, would like size S",
        },
      ],
      location: location.id,
      refundAmount: rupees(2500),
      currency: "INR",
      internalNote: "[DEMO] Reverse pickup booked with Delhivery.",
      metadata,
    },
  });

  // Carts: one in progress, one abandoned
  await payload.create({
    collection: "carts",
    data: {
      customer: diya.id,
      status: "active",
      currency: "INR",
      subtotal: rupees(2500),
      items: [{ product: vest.id, variant: vestOliveS, quantity: 1 }],
    },
  });
  await payload.create({
    collection: "carts",
    data: {
      customer: kabir.id,
      status: "abandoned",
      currency: "INR",
      subtotal: rupees(4900),
      items: [{ product: blouse.id, variant: blouseCreamM, quantity: 2 }],
    },
  });

  // Stock holds: one per state
  const hold = (
    key: string,
    label: string,
    status: "active" | "converted" | "released",
    expiresAt: string,
    n: number,
  ) =>
    payload.create({
      collection: "stock-holds",
      data: {
        item: key,
        label,
        quantity: 1,
        status,
        expiresAt,
        checkout: `${DEMO_CHECKOUT_PREFIX}${n}`,
        holder: `customer:${diya.id}`,
      },
    });
  await hold(
    `variants:${vestOliveS}`,
    "[DEMO] Fleece Vest Olive / S",
    "converted",
    daysAgo(3),
    1,
  );
  await hold(
    `variants:${blouseCreamM}`,
    "[DEMO] Checkered Blouse Cream / M",
    "released",
    daysAgo(1),
    2,
  );
  await hold(
    `products:${shirt.id}`,
    "[DEMO] Denim Zip Shirt",
    "active",
    new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    3,
  );

  // Promotions, campaigns and price lists (none apply at checkout yet)
  const campaign = await payload.create({
    collection: "campaigns",
    data: {
      name: "[DEMO] Diwali Sale",
      identifier: "demo-diwali-sale",
      description: "Festive discounts across the store.",
      startsAt: daysFromNow(5),
      endsAt: daysFromNow(15),
      budget: { type: "spend", currency: "INR", limit: rupees(50000) },
      metadata,
    },
  });
  await payload.create({
    collection: "promotions",
    data: {
      code: "DEMO-WELCOME10",
      type: "standard",
      status: "draft",
      applicationMethod: { type: "percentage", value: 10, targetType: "order" },
      usageLimit: 500,
      metadata,
    },
  });
  await payload.create({
    collection: "promotions",
    data: {
      code: "DEMO-DIWALI500",
      type: "standard",
      status: "draft",
      campaign: campaign.id,
      applicationMethod: {
        type: "fixed",
        value: rupees(500),
        currency: "INR",
        targetType: "order",
      },
      startsAt: daysFromNow(5),
      endsAt: daysFromNow(15),
      metadata,
    },
  });
  await payload.create({
    collection: "price-lists",
    data: {
      title: "[DEMO] Weekend vest sale",
      description: "All fleece vests at ₹1,999 for the weekend.",
      type: "sale",
      status: "draft",
      startsAt: daysFromNow(2),
      endsAt: daysFromNow(4),
      customerGroups: [vip.id],
      prices: [
        { variant: vestMaroonXS, currency: "INR", amount: rupees(1999) },
        { variant: vestOliveS, currency: "INR", amount: rupees(1999) },
      ],
      metadata,
    },
  });

  payload.logger.info(
    "Demo data added. Everything is labelled [DEMO]; remove it with `pnpm seed:demo:remove`.",
  );
}

if (remove) await removeDemo();
else await seedDemo();

await payload.destroy();
process.exit(0);
