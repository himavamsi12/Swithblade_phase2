import path from "node:path";
import { fileURLToPath } from "node:url";
import { ecommercePlugin } from "@payloadcms/plugin-ecommerce";
import { stripeAdapter } from "@payloadcms/plugin-ecommerce/payments/stripe";
import { s3Storage as s3StoragePlugin } from "@payloadcms/storage-s3";
import { buildConfig } from "payload";
import sharp from "sharp";
import {
  adminOnlyFieldAccess,
  adminOrPublishedStatus,
  anyone,
  isAdmin,
  isAuthenticated,
  isCustomer,
  isDocumentOwner,
} from "./payload/access";
import { Campaigns } from "./payload/collections/campaigns";
import { CustomerGroups } from "./payload/collections/customer-groups";
import { Customers } from "./payload/collections/customers";
import { Media } from "./payload/collections/media";
import { PriceLists } from "./payload/collections/price-lists";
import { ProductCategories } from "./payload/collections/product-categories";
import { ProductCollections } from "./payload/collections/product-collections";
import { ProductTags } from "./payload/collections/product-tags";
import { ProductTypes } from "./payload/collections/product-types";
import { Promotions } from "./payload/collections/promotions";
import { Regions } from "./payload/collections/regions";
import { ReturnReasons } from "./payload/collections/return-reasons";
import { Returns } from "./payload/collections/returns";
import { StockHolds } from "./payload/collections/stock-holds";
import { SalesChannels } from "./payload/collections/sales-channels";
import { ShippingOptions } from "./payload/collections/shipping-options";
import { ShippingProfiles } from "./payload/collections/shipping-profiles";
import { StockLocations } from "./payload/collections/stock-locations";
import { TaxRegions } from "./payload/collections/tax-regions";
import { Users } from "./payload/collections/users";
import { supportedCountries } from "./payload/countries";
import { currenciesConfig } from "./payload/currencies";
import { payloadEnv, s3Storage, stripeEnabled } from "./payload/env";
import { databaseAdapter } from "./payload/db";
import { Store } from "./payload/globals/store";
import { orderCollections } from "./payload/order-collections";
import { staffTotp } from "./payload/staff-totp";
import {
  addressesOverride,
  cartsOverride,
  transactionsOverride,
  variantOptionsOverride,
  variantTypesOverride,
} from "./payload/overrides/misc";
import { ordersOverride } from "./payload/overrides/orders";
import { productsOverride } from "./payload/overrides/products";
import { variantsOverride } from "./payload/overrides/variants";

const dirname = path.dirname(fileURLToPath(import.meta.url));

/*
 * Origins whose admin login cookie Payload accepts (its CSRF check). The
 * admin is reached on more than serverURL: Vercel's production and
 * deployment domains, and locally on whatever port `next dev` picked.
 */
const vercelOrigins = [
  process.env.VERCEL_PROJECT_PRODUCTION_URL,
  process.env.VERCEL_URL,
  process.env.VERCEL_BRANCH_URL,
]
  .filter((host): host is string => Boolean(host))
  .map((host) => `https://${host}`);
const devOrigins =
  process.env.NODE_ENV === "production"
    ? []
    : [3000, 3001, 3002, 3003].map((port) => `http://localhost:${port}`);
const trustedOrigins = [
  ...new Set(
    [payloadEnv.NEXT_PUBLIC_SITE_URL, ...vercelOrigins, ...devOrigins].map(
      (url) => new URL(url).origin,
    ),
  ),
];

export default buildConfig({
  serverURL: payloadEnv.NEXT_PUBLIC_SITE_URL,
  csrf: trustedOrigins,
  secret: payloadEnv.PAYLOAD_SECRET,
  sharp,
  admin: {
    user: Users.slug,
    theme: "light",
    importMap: { baseDir: dirname },
    meta: {
      titleSuffix: " · Switchblade Admin",
      icons: [{ rel: "icon", url: "/favicon.ico" }],
    },
    components: {
      graphics: {
        Logo: "/payload/admin/brand#Logo",
        Icon: "/payload/admin/brand#Icon",
      },
      beforeNavLinks: ["/payload/admin/store-switcher#StoreSwitcher"],
      views: {
        dashboard: { Component: "/payload/admin/dashboard#Dashboard" },
      },
    },
  },
  collections: [
    Returns,
    Media,
    ProductCategories,
    ProductCollections,
    Customers,
    CustomerGroups,
    Promotions,
    Campaigns,
    PriceLists,
    Users,
    Regions,
    TaxRegions,
    ReturnReasons,
    SalesChannels,
    ProductTypes,
    ProductTags,
    StockLocations,
    StockHolds,
    ShippingOptions,
    ShippingProfiles,
  ],
  globals: [Store],
  db: databaseAdapter(dirname),
  typescript: { outputFile: path.resolve(dirname, "payload-types.ts") },
  graphQL: { disablePlaygroundInProduction: true },
  plugins: [
    // Media files in a (private) Supabase Storage bucket, served via Payload.
    s3StoragePlugin({
      enabled: Boolean(s3Storage),
      // Same schema with or without storage configured, so one set of
      // migrations fits every environment.
      alwaysInsertFields: true,
      collections: { media: true },
      bucket: s3Storage?.bucket ?? "",
      config: {
        endpoint: s3Storage?.endpoint,
        region: s3Storage?.region,
        // Supabase's S3 endpoint needs path-style bucket URLs.
        forcePathStyle: true,
        credentials: s3Storage
          ? {
              accessKeyId: s3Storage.accessKeyId,
              secretAccessKey: s3Storage.secretAccessKey,
            }
          : undefined,
      },
    }),
    ecommercePlugin({
      access: {
        adminOnlyFieldAccess,
        adminOrPublishedStatus,
        isAdmin,
        isAuthenticated,
        isCustomer,
        isDocumentOwner,
        publicAccess: anyone,
      },
      customers: { slug: Customers.slug },
      currencies: currenciesConfig,
      addresses: {
        supportedCountries,
        addressesCollectionOverride: addressesOverride,
      },
      products: {
        productsCollectionOverride: productsOverride,
        variants: {
          variantsCollectionOverride: variantsOverride,
          variantTypesCollectionOverride: variantTypesOverride,
          variantOptionsCollectionOverride: variantOptionsOverride,
        },
      },
      orders: { ordersCollectionOverride: ordersOverride },
      carts: { cartsCollectionOverride: cartsOverride },
      transactions: { transactionsCollectionOverride: transactionsOverride },
      payments: stripeEnabled
        ? {
            paymentMethods: [
              stripeAdapter({
                secretKey: payloadEnv.STRIPE_SECRET_KEY!,
                publishableKey: payloadEnv.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!,
                webhookSecret: payloadEnv.STRIPE_WEBHOOKS_SIGNING_SECRET,
              }),
            ],
          }
        : undefined,
    }),
    // Medusa's sidebar order.
    orderCollections([
      "orders",
      "returns",
      "carts",
      "transactions",
      "products",
      "product-categories",
      "product-collections",
      "variantTypes",
      "media",
      "variants",
      "customers",
      "customer-groups",
      "addresses",
      "promotions",
      "campaigns",
      "price-lists",
      "users",
      "regions",
      "tax-regions",
      "return-reasons",
      "sales-channels",
      "product-types",
      "product-tags",
      "stock-locations",
      "shipping-options",
      "shipping-profiles",
    ]),
    // Authenticator codes at admin sign-in. Last: it wraps every collection.
    staffTotp("Switchblade Admin"),
  ],
});
