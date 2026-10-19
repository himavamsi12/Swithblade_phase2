import { z } from "zod";

/**
 * Validated environment variables. Fails fast at build/boot with a readable
 * message instead of surfacing `undefined` deep inside a request.
 *
 * NEXT_PUBLIC_* vars must be referenced statically (not via a loop) so Next can
 * inline them into the client bundle. Add server-only secrets to a separate
 * schema guarded by `import "server-only"` when they are introduced.
 */
const schema = z.object({
  NEXT_PUBLIC_SITE_URL: z.url(),
});

const parsed = schema.safeParse({
  NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
});

if (!parsed.success) {
  throw new Error(
    `Invalid environment variables:\n${z.prettifyError(parsed.error)}`,
  );
}

export const env = parsed.data;
