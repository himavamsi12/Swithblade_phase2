/**
 * Accepts the server-side names or the `NEXT_PUBLIC_` ones Supabase's
 * dashboard suggests. Both hold the public (publishable/anon) key.
 */
export function readSupabaseEnv() {
  return {
    SUPABASE_URL:
      process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY:
      process.env.SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}
