import "server-only";
import { getPayloadClient } from "@/features/account/customer";
import type { Promotion } from "@/payload-types";
import { normalizeCode, type ProductRules } from "./discount";

/**
 * The promotion with this code, its campaign and regions populated. Read
 * fresh every time, so a coupon paused in the admin stops working at once.
 */
export async function findPromotionByCode(
  code: string,
): Promise<Promotion | null> {
  const payload = await getPayloadClient();
  const { docs } = await payload.find({
    collection: "promotions",
    where: { code: { equals: normalizeCode(code) } },
    limit: 1,
    depth: 1,
  });
  return docs[0] ?? null;
}

/** Whether each product takes promotions, and what it's grouped under. */
export async function getProductRules(
  productIds: number[],
): Promise<Map<number, ProductRules>> {
  if (productIds.length === 0) return new Map();
  const payload = await getPayloadClient();
  const { docs } = await payload.find({
    collection: "products",
    where: { id: { in: productIds } },
    limit: productIds.length,
    pagination: false,
    depth: 0,
    select: { discountable: true, categories: true, collection: true },
  });
  const id = (ref: unknown) =>
    typeof ref === "object" && ref !== null ? (ref as { id: number }).id : ref;
  return new Map(
    docs.map((doc) => [
      doc.id,
      {
        discountable: doc.discountable === true,
        categoryIds: (doc.categories ?? []).map(id) as number[],
        collectionId: (id(doc.collection) as number | undefined) ?? null,
      },
    ]),
  );
}

/** Whether a promotion still exists, so an order never links a deleted one. */
export async function promotionExists(id: number) {
  const payload = await getPayloadClient();
  const { totalDocs } = await payload.count({
    collection: "promotions",
    where: { id: { equals: id } },
  });
  return totalDocs > 0;
}
