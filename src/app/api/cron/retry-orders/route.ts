import { retryOrderFollowUps } from "@/features/checkout/retry";
import { isAuthorizedCron } from "@/lib/cron";

export const dynamic = "force-dynamic";
// Razorpay and Shiprocket calls for a backlog of orders can take a while.
export const maxDuration = 300;

/** Scheduled in vercel.json: recovers missed orders and retries follow-ups. */
export async function GET(request: Request) {
  if (!isAuthorizedCron(request.headers.get("authorization"))) {
    return new Response("Unauthorized", { status: 401 });
  }
  try {
    const summary = await retryOrderFollowUps();
    return Response.json(summary, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Order retry cron failed", error);
    return Response.json({ error: "failed" }, { status: 500 });
  }
}
