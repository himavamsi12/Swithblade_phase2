/**
 * Admin sidebar sections, in the same order as the Medusa dashboard. Payload
 * orders nav groups by the first collection registered in each, so
 * `payload.config.ts` registers collections in this order.
 */
export const group = {
  orders: "Orders",
  products: "Products",
  inventory: "Inventory",
  customers: "Customers",
  promotions: "Promotions",
  pricing: "Price Lists",
  settings: "Settings",
} as const;
