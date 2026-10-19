import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/features/auth/redirect";
import { createSupabaseServerClient } from "@/lib/supabase-server";

/**
 * For email templates that link here with `token_hash` (Supabase's
 * recommended template for server-side apps), e.g.
 * `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = safeNextPath(
    searchParams.get("next"),
    type === "recovery" ? "/account/reset-password" : "/account",
  );

  if (tokenHash && type) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) return NextResponse.redirect(new URL(next, origin));
  }

  return NextResponse.redirect(new URL("/account?error=link", origin));
}
