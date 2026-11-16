import { applyMagicPromotion } from "@/features/checkout/magic-promotions";

export const dynamic = "force-dynamic";

// Magic Checkout's "apply promotions" URL: checks the code a shopper typed in
// Razorpay's window against the store's coupons for that order's bag.
export async function POST(request: Request) {
  const text = await request.text();
  const body = parseBody(text);
  // What Razorpay sends and what we answer, for checking the integration in
  // the logs. No phone or email.
  const fields = body && typeof body === "object" ? body : {};
  console.info(
    "Magic coupon request",
    JSON.stringify({
      contentType: request.headers.get("content-type"),
      fields: Object.keys(fields),
      order_id: (fields as Record<string, unknown>).order_id,
      razorpay_order_id: (fields as Record<string, unknown>).razorpay_order_id,
      code: (fields as Record<string, unknown>).code,
      ...(body === null && { raw: text.slice(0, 200) }),
    }),
  );
  try {
    const result = await applyMagicPromotion(body);
    console.info("Magic coupon answer", JSON.stringify(result.body));
    return Response.json(result.body, { status: result.ok ? 200 : 400 });
  } catch (error) {
    console.error("Magic Checkout coupon check failed", error);
    return Response.json(
      {
        failure_code: "INVALID_PROMOTION",
        failure_reason: "Couldn't check this coupon. Please try again.",
      },
      { status: 400 },
    );
  }
}

/** JSON, or a form-encoded body, as an object; null if neither. */
function parseBody(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const form = new URLSearchParams(text);
    return [...form.keys()].length > 0 ? Object.fromEntries(form) : null;
  }
}
