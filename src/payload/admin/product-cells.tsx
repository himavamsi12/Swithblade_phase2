import type { DefaultServerCellComponentProps, Payload } from "payload";
import type { Media, Product } from "@/payload-types";

/*
 * Products list columns: photo with title and handle, total stock across
 * variants with a low/out-of-stock badge, and the price (or price range).
 */

const LOW_STOCK = 5;

type Row = Partial<Product> & { id: number };

const rupees = (paise: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: paise % 100 === 0 ? 0 : 2,
  }).format(paise / 100);

const idOf = (value: unknown) =>
  typeof value === "number"
    ? value
    : typeof value === "object" && value !== null && "id" in value
      ? (value as { id: number }).id
      : null;

async function photo(payload: Payload, row: Row) {
  const id = idOf(row.thumbnail) ?? idOf(row.images?.[0]);
  if (!id) return null;
  const media = (await payload
    .findByID({ collection: "media", id, depth: 0 })
    .catch(() => null)) as Media | null;
  const url = media?.sizes?.thumbnail?.url || media?.url;
  // Payload prefixes serverURL; a relative path loads from the admin's own
  // domain (Vercel's, or whichever port `next dev` is on).
  return url ? url.replace(/^https?:\/\/[^/]+/, "") : null;
}

async function variantsOf(payload: Payload, productId: number) {
  const { docs } = await payload.find({
    collection: "variants",
    where: { product: { equals: productId } },
    pagination: false,
    depth: 0,
    draft: true,
    select: {
      inventory: true,
      manageInventory: true,
      priceInINR: true,
      priceInINREnabled: true,
    },
  });
  return docs;
}

export async function ProductCell({
  payload,
  rowData,
  linkURL,
}: DefaultServerCellComponentProps) {
  const row = rowData as Row | undefined;
  // Payload also renders cells without a row while building the columns.
  if (!row?.id) return null;
  const src = await photo(payload, row);
  const href =
    linkURL ?? `${payload.config.routes.admin}/collections/products/${row.id}`;
  return (
    <a href={href} className="sb-product-cell">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- admin thumbnail
        <img src={src} alt="" className="sb-product-cell__img" />
      ) : (
        <span className="sb-product-cell__img sb-product-cell__img--empty">
          No photo
        </span>
      )}
      <span className="sb-product-cell__text">
        <span className="sb-product-cell__title">
          {row.title || "Untitled"}
        </span>
        {row.handle && (
          <span className="sb-product-cell__handle">/{row.handle}</span>
        )}
      </span>
    </a>
  );
}

export async function StockCell({
  payload,
  rowData,
}: DefaultServerCellComponentProps) {
  const row = rowData as Row | undefined;
  // Payload also renders cells without a row while building the columns.
  if (!row?.id) return null;
  if (!row.enableVariants) {
    const stock = row.inventory ?? 0;
    return <StockBadge total={stock} soldOut={stock <= 0 ? 1 : 0} count={0} />;
  }
  const variants = (await variantsOf(payload, row.id)).filter(
    (v) => v.manageInventory !== false,
  );
  if (variants.length === 0) {
    return <span className="sb-badge sb-badge--grey">No variants yet</span>;
  }
  const total = variants.reduce((sum, v) => sum + (v.inventory ?? 0), 0);
  const soldOut = variants.filter((v) => (v.inventory ?? 0) <= 0).length;
  return <StockBadge total={total} soldOut={soldOut} count={variants.length} />;
}

function StockBadge({
  total,
  soldOut,
  count,
}: {
  total: number;
  soldOut: number;
  count: number;
}) {
  const tone =
    total <= 0 ? "red" : soldOut > 0 || total <= LOW_STOCK ? "orange" : "green";
  return (
    <span className="sb-stock">
      <span className={`sb-badge sb-badge--${tone}`}>
        <span className="sb-badge__dot" aria-hidden />
        {total <= 0 ? "Out of stock" : `${total} in stock`}
      </span>
      {count > 0 && (
        <span className="sb-stock__meta">
          {count} variant{count === 1 ? "" : "s"}
          {soldOut > 0 && total > 0 ? ` · ${soldOut} sold out` : ""}
        </span>
      )}
    </span>
  );
}

export async function PriceCell({
  payload,
  rowData,
}: DefaultServerCellComponentProps) {
  const row = rowData as Row | undefined;
  // Payload also renders cells without a row while building the columns.
  if (!row?.id) return null;
  const prices = row.enableVariants
    ? (await variantsOf(payload, row.id))
        .filter((v) => v.priceInINREnabled && v.priceInINR != null)
        .map((v) => v.priceInINR!)
    : [];
  if (prices.length === 0 && row.priceInINREnabled && row.priceInINR != null) {
    prices.push(row.priceInINR);
  }
  if (prices.length === 0) {
    return <span className="sb-badge sb-badge--red">No ₹ price</span>;
  }
  const low = Math.min(...prices);
  const high = Math.max(...prices);
  return (
    <span>
      {low === high ? rupees(low) : `${rupees(low)} – ${rupees(high)}`}
    </span>
  );
}
