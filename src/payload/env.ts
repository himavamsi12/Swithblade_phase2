import { z } from "zod";

/**
 * Server-only settings for Payload. Kept separate from `src/lib/env.ts` so the
 * storefront bundle never sees them, and free of `server-only` so the Payload
 * CLI (`payload generate:types`, migrations) can load the config too.
 */
const schema = z.object({
  /**
   * Runtime connection. On Supabase use the Supavisor transaction pooler
   * (port 6543), which suits serverless and many app instances.
   */
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required (Postgres)"),
  /**
   * Used by `pnpm migrate`. On Supabase use the session pooler (port 5432)
   * or the direct connection; migrations hold one connection for a while.
   */
  DATABASE_MIGRATION_URL: z.string().optional(),
  /** Supabase root CA (PEM text) so TLS certificates are verified. */
  DATABASE_CA_CERT: z.string().optional(),
  /** Max connections per app instance. Defaults: 3 on Vercel, 10 elsewhere. */
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(50).optional(),
  PAYLOAD_SECRET: z.string().min(32, "PAYLOAD_SECRET must be 32+ characters"),
  NEXT_PUBLIC_SITE_URL: z.url(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOKS_SIGNING_SECRET: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(
    `Invalid Payload environment variables:\n${z.prettifyError(parsed.error)}`,
  );
}

export const payloadEnv = parsed.data;

export const stripeEnabled = Boolean(
  payloadEnv.STRIPE_SECRET_KEY && payloadEnv.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
);
