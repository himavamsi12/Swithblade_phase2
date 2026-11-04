import { applyTrackingEvent } from "@/features/shipping/repository";
import { isValidTrackingToken } from "@/features/shipping/shiprocket";
import { trackingEventSchema } from "@/features/shipping/tracking-update";

export const dynamic = "force-dynamic";

/*
 * Shiprocket's tracking webhook (Settings → API → Webhooks). Shiprocket
 * refuses URLs containing "shiprocket", "kartrocket", "sr" or "kr", hence
 * this path. Every event moves the order's status and timeline forward.
 * Shiprocket expects only 200s, so failures are logged, not returned: the
 * next event for the parcel carries its latest status anyway.
 */
export async function POST(request: Request) {
  if (!isValidTrackingToken(request.headers.get("x-api-key"))) {
    return new Response("Unauthorized", { status: 401 });
  }
  const event = trackingEventSchema.safeParse(
    await request.json().catch(() => null),
  );
  // Not an event we can use (or Shiprocket's test ping): acknowledge it.
  if (!event.success) return Response.json({ ok: true });
  try {
    const result = await applyTrackingEvent(event.data);
    if (result === "unknown-order") {
      console.warn(`Tracking update for unknown order ${event.data.order_id}`);
    }
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Applying tracking update failed", error);
    return Response.json({ ok: false });
  }
}
