import { getRates } from "@/features/currency/rates";

// Rendered per request so a failed upstream call is never baked into a static
// response; the upstream fetch itself is cached by `getRates`.
export const dynamic = "force-dynamic";

export async function GET() {
  const rates = await getRates();
  if (!rates) {
    return Response.json(
      { error: "Rates unavailable" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
  return Response.json(
    { rates },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
      },
    },
  );
}
