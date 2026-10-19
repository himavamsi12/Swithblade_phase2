import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { readSupabaseEnv } from "@/lib/supabase-env";

/**
 * Keeps the shopper's Supabase session fresh: validates the auth cookie and,
 * when the access token has expired, refreshes it and writes the new cookies
 * to both the request (for this render) and the response (for the browser).
 * Based on Supabase's official Next.js example.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const { SUPABASE_URL: url, SUPABASE_PUBLISHABLE_KEY: key } =
    readSupabaseEnv();
  // Nothing to refresh without a session cookie, or before Supabase is configured.
  const hasSession = request.cookies
    .getAll()
    .some(({ name }) => name.startsWith("sb-"));
  if (!url || !key || !hasSession) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        // Stops CDNs from caching a response that sets auth cookies.
        Object.entries(headers).forEach(([k, v]) => response.headers.set(k, v));
      },
    },
  });

  // Keep this call directly after createServerClient (Supabase's guidance):
  // it's what refreshes the session. Don't remove it.
  await supabase.auth.getClaims();

  return response;
}

export const config = {
  matcher: [
    // Pages only: skip static files, images, the Payload admin and APIs.
    "/((?!_next/static|_next/image|favicon.ico|admin|api|images|media|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|txt|xml)$).*)",
  ],
};
