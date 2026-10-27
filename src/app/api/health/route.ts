import { databaseIsUp } from "@/features/health/repository";

export const dynamic = "force-dynamic";

/** For uptime monitors: 503 when the database is unreachable. */
export async function GET() {
  const database = await databaseIsUp();
  return Response.json(
    { status: database ? "ok" : "degraded", database },
    {
      status: database ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
