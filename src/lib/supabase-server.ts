import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabaseConfig } from "./supabase";

/**
 * Supabase client for Server Components, Server Actions and Route Handlers,
 * reading and writing the auth session cookies. Create one per request; never
 * share it between requests.
 *
 * Uses the server-only URL and publishable key: auth runs entirely on the
 * server, so no Supabase key is shipped to the browser.
 */
export async function createSupabaseServerClient() {
  const { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } = getSupabaseConfig();
  const cookieStore = await cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Called from a Server Component, where cookies are read-only.
          // Safe to ignore: src/proxy.ts refreshes the session on every page.
        }
      },
    },
  });
}

/** Signed-in shopper's verified JWT claims, or null. */
export async function getCurrentUser() {
  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub) return null;
  return {
    id: claims.sub,
    email: typeof claims.email === "string" ? claims.email : null,
  };
}
