import type { Access, FieldAccess, PayloadRequest } from "payload";

/*
 * Only staff (the `users` collection) sign in to Payload. Shoppers sign in
 * with Supabase Auth on the storefront and are mirrored into `customers`;
 * the storefront reads and writes their data on the server, so no shopper
 * ever holds a Payload session.
 */
const isStaff = (req: PayloadRequest) => req.user?.collection === "users";

export const isAdmin: Access = ({ req }) => isStaff(req);

/** Staff with the "admin" role: users, store settings and API-level config. */
export const isSuperAdmin: Access = ({ req }) =>
  isStaff(req) && (req.user as { role?: string } | null)?.role === "admin";

export const adminOnlyFieldAccess: FieldAccess = ({ req }) => isStaff(req);

/** No Payload-authenticated shoppers exist (see above). */
export const isCustomer: FieldAccess = () => false;

export const isAuthenticated: Access = ({ req }) => Boolean(req.user);

export const anyone: Access = () => true;

/** Staff see everything; everyone else only sees published documents. */
export const adminOrPublishedStatus: Access = ({ req }) =>
  isStaff(req) ? true : { _status: { equals: "published" } };

/**
 * Orders, carts, addresses and returns: staff only through Payload's API.
 * Shoppers reach their own records through storefront server code, which
 * checks their Supabase session.
 */
export const isDocumentOwner: Access = ({ req }) => isStaff(req);
