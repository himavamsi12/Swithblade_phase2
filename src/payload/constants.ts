/**
 * Postgres schema holding Payload's tables. Kept out of `public` so
 * Supabase's Data API (which exposes `public` by default) can't reach them.
 */
export const DB_SCHEMA = "payload";
