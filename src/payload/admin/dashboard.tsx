import { sql } from "@payloadcms/db-postgres";
import type { PostgresAdapter } from "@payloadcms/db-postgres";
import type { Route } from "next";
import Link from "next/link";
import type { AdminViewServerProps, PayloadRequest } from "payload";
import { currenciesConfig } from "../currencies";
import { DB_SCHEMA } from "../constants";

const LOW_STOCK = 5;
const DAYS = 30;

type Tone = "green" | "orange" | "red" | "blue" | "grey";

const paymentTone: Record<string, Tone> = {
  captured: "green",
  authorized: "blue",
  awaiting: "orange",
  requires_action: "orange",
  partially_refunded: "grey",
  refunded: "grey",
  canceled: "red",
};

const fulfillmentTone: Record<string, Tone> = {
  delivered: "green",
  shipped: "green",
  fulfilled: "blue",
  partially_fulfilled: "orange",
  not_fulfilled: "orange",
  returned: "grey",
  canceled: "red",
};

const humanize = (value?: string | null) =>
  value
    ? value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " ")
    : "—";

function formatMoney(amount: number | null | undefined, code?: string | null) {
  const currency =
    currenciesConfig.supportedCurrencies.find(
      (c) => c.code === (code ?? currenciesConfig.defaultCurrency),
    ) ?? currenciesConfig.supportedCurrencies[0]!;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: currency.code,
  }).format((amount ?? 0) / 10 ** currency.decimals);
}

function Badge({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span className={`sb-badge sb-badge--${tone}`}>
      <span className="sb-badge__dot" aria-hidden />
      {children}
    </span>
  );
}

/** Loads every number the dashboard shows, in parallel. */
async function loadDashboard(req: PayloadRequest) {
  const { payload } = req;
  const since = new Date(Date.now() - DAYS * 86_400_000).toISOString();

  const store = await payload.findGlobal({ slug: "store", depth: 0, req });
  const currency = store?.defaultCurrency ?? currenciesConfig.defaultCurrency;
  const db = payload.db as unknown as PostgresAdapter;

  const [orders30, products, customers, lowStock, revenue, recent] =
    await Promise.all([
      payload.count({
        collection: "orders",
        where: { createdAt: { greater_than_equal: since } },
        req,
      }),
      payload.count({ collection: "products", req }),
      payload.count({ collection: "customers", req }),
      payload.count({
        collection: "variants",
        where: {
          and: [
            { manageInventory: { equals: true } },
            { inventory: { less_than_equal: LOW_STOCK } },
          ],
        },
        req,
      }),
      // Summed in SQL so the dashboard stays fast with many orders.
      db.drizzle
        .execute(
          sql`select coalesce(sum(amount), 0)::bigint as total
              from ${sql.identifier(DB_SCHEMA)}.orders
              where currency = ${currency}
                and status <> 'cancelled'
                and created_at >= ${since}`,
        )
        .then((r) => Number((r.rows[0] as { total?: string })?.total ?? 0)),
      payload.find({
        collection: "orders",
        sort: "-createdAt",
        limit: 8,
        depth: 0,
        req,
        select: {
          title: true,
          createdAt: true,
          customerEmail: true,
          paymentStatus: true,
          fulfillmentStatus: true,
          amount: true,
          currency: true,
        },
      }),
    ]);

  return {
    store,
    currency,
    orders30,
    products,
    customers,
    lowStock,
    revenue,
    recent,
  };
}

/**
 * Admin home in the spirit of Medusa's: headline numbers and the latest
 * orders. All queries run in parallel and only select what is shown.
 */
export async function Dashboard({ initPageResult }: AdminViewServerProps) {
  const { req } = initPageResult;
  const { payload, user } = req;
  const adminRoute = payload.config.routes.admin;
  const to = (path: string) => `${adminRoute}${path}` as Route;
  const {
    store,
    currency,
    orders30,
    products,
    customers,
    lowStock,
    revenue,
    recent,
  } = await loadDashboard(req);

  const firstName = (user as { firstName?: string } | null)?.firstName;

  const stats = [
    {
      label: `Orders (${DAYS} days)`,
      value: orders30.totalDocs.toLocaleString(),
      href: "/collections/orders",
    },
    {
      label: `Revenue (${DAYS} days)`,
      value: formatMoney(revenue, currency),
      href: "/collections/orders",
    },
    {
      label: "Products",
      value: products.totalDocs.toLocaleString(),
      href: "/collections/products",
    },
    {
      label: "Customers",
      value: customers.totalDocs.toLocaleString(),
      href: "/collections/customers",
    },
    {
      label: "Low stock items",
      value: lowStock.totalDocs.toLocaleString(),
      href: "/collections/variants",
      warn: lowStock.totalDocs > 0,
    },
  ];

  return (
    <div className="sb-dash">
      <header className="sb-dash__header">
        <div>
          <h1 className="sb-dash__title">
            {firstName ? `Welcome back, ${firstName}` : "Welcome back"}
          </h1>
          <p className="sb-dash__subtitle">
            Here&apos;s what&apos;s happening in {store?.name ?? "your store"}.
          </p>
        </div>
        <div className="sb-dash__actions">
          <Link
            className="sb-btn sb-btn--secondary"
            href={to("/collections/orders")}
          >
            View orders
          </Link>
          <Link
            className="sb-btn sb-btn--primary"
            href={to("/collections/products/create")}
          >
            Create product
          </Link>
        </div>
      </header>

      <section className="sb-stats" aria-label="Store overview">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={to(s.href)}
            className={["sb-card sb-stat", s.warn && "sb-stat--warn"]
              .filter(Boolean)
              .join(" ")}
          >
            <span className="sb-stat__label">{s.label}</span>
            <span className="sb-stat__value">{s.value}</span>
          </Link>
        ))}
      </section>

      <section
        className="sb-card sb-table-card"
        aria-labelledby="recent-orders"
      >
        <div className="sb-table-card__header">
          <h2 id="recent-orders" className="sb-table-card__title">
            Recent orders
          </h2>
          <Link href={to("/collections/orders")} className="sb-link">
            View all
          </Link>
        </div>
        {recent.docs.length === 0 ? (
          <p className="sb-empty">
            No orders yet. They&apos;ll show up here as they come in.
          </p>
        ) : (
          <table className="sb-table">
            <thead>
              <tr>
                <th>Order</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Payment</th>
                <th>Fulfillment</th>
                <th className="sb-table__num">Total</th>
              </tr>
            </thead>
            <tbody>
              {recent.docs.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link
                      href={to(`/collections/orders/${o.id}`)}
                      className="sb-link"
                    >
                      {o.title ?? `#${o.id}`}
                    </Link>
                  </td>
                  <td>
                    {new Date(o.createdAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </td>
                  <td>{o.customerEmail ?? "—"}</td>
                  <td>
                    <Badge tone={paymentTone[o.paymentStatus ?? ""] ?? "grey"}>
                      {humanize(o.paymentStatus)}
                    </Badge>
                  </td>
                  <td>
                    <Badge
                      tone={
                        fulfillmentTone[o.fulfillmentStatus ?? ""] ?? "grey"
                      }
                    >
                      {humanize(o.fulfillmentStatus)}
                    </Badge>
                  </td>
                  <td className="sb-table__num">
                    {formatMoney(o.amount, o.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
