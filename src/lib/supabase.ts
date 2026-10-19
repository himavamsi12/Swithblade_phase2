import "server-only";
import { z } from "zod";
import { readSupabaseEnv } from "./supabase-env";

/**
 * Minimal read-only client for Supabase's Data API (PostgREST), used from
 * repositories. Uses the publishable key, so every query is limited by the
 * table's RLS policies (e.g. only published products are visible).
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

type SelectOptions = {
  /** Cache tags, for on-demand `revalidateTag`. */
  tags: string[];
  /** Cache lifetime in seconds. */
  revalidate?: number;
  /** Ask PostgREST for the total row count (ignoring limit/offset). */
  count?: boolean;
};

/**
 * `GET /rest/v1/<table>?<query>`. Returns the rows and, when `count` is set,
 * the total number of matching rows.
 */
export async function supabaseSelect<T>(
  table: string,
  query: URLSearchParams,
  { tags, revalidate = 60, count = false }: SelectOptions,
): Promise<{ rows: T[]; total: number | null }> {
  const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = getSupabaseConfig();
  const url = new URL(`/rest/v1/${table}`, SUPABASE_URL);
  url.search = query.toString();

  const res = await fetch(url, {
    headers: {
      apikey: SUPABASE_PUBLISHABLE_KEY,
      Accept: "application/json",
      ...(count ? { Prefer: "count=exact" } : {}),
    },
    next: { revalidate, tags },
  });
  // PostgREST answers 416 when `offset` is past the last row; that's an empty
  // page, not a failure. Content-Range still carries the total.
  const outOfRange = res.status === 416;
  if (!res.ok && !outOfRange) {
    throw new Error(
      `Supabase ${table} query failed: ${res.status} ${await res.text()}`,
    );
  }

  // Content-Range: "0-19/200" or "*/0".
  const total = count
    ? Number(res.headers.get("content-range")?.split("/")[1] ?? NaN)
    : null;
  return {
    rows: outOfRange ? [] : ((await res.json()) as T[]),
    total: Number.isFinite(total) ? total : null,
  };
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
