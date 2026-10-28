import "server-only";
import { z } from "zod";
import { readSupabaseEnv } from "./supabase-env";

/**
 * Supabase project settings for shopper auth. Uses the publishable key only,
 * so anything it can reach is limited by RLS.
 */
const schema = z.object({
  SUPABASE_URL: z.url(),
  SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
});

let config: z.infer<typeof schema> | undefined;

// Validated on first use rather than at import, so builds and tools that never
// query Supabase don't need the variables.
export function getSupabaseConfig() {
  if (config) return config;
  const parsed = schema.safeParse(readSupabaseEnv());
  if (!parsed.success) {
    throw new Error(
      `Invalid Supabase environment variables:\n${z.prettifyError(parsed.error)}`,
    );
  }
  config = parsed.data;
  return config;
}

/**
 * Whether a sign-in provider (e.g. "google") is switched on in Supabase.
 * Not cached: it only runs when someone presses that sign-in button, and a
 * provider switched on in the dashboard must work immediately.
 */
export async function isAuthProviderEnabled(provider: string) {
  const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = getSupabaseConfig();
  try {
    const res = await fetch(new URL("/auth/v1/settings", SUPABASE_URL), {
      headers: { apikey: SUPABASE_PUBLISHABLE_KEY },
      cache: "no-store",
    });
    if (!res.ok) return false;
    const settings = (await res.json()) as {
      external?: Record<string, boolean>;
    };
    return settings.external?.[provider] === true;
  } catch {
    return false;
  }
}
