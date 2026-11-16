import { getPayloadClient } from "@/features/account/customer";
import { applyMagicPromotion } from "@/features/checkout/magic-promotions";

export const dynamic = "force-dynamic";

// Magic Checkout's "apply promotions" URL: checks the code a shopper typed in
// Razorpay's window against the store's coupons for that order's bag.
export async function POST(request: Request) {
  const text = await request.text();
  const body = parseBody(text);
  let answer: { status: number; body: unknown };
  try {
    const result = await applyMagicPromotion(body);
    answer = { status: result.ok ? 200 : 400, body: result.body };
  } catch (error) {
    console.error("Magic Checkout coupon check failed", error);
    answer = {
      status: 400,
      body: {
        failure_code: "INVALID_PROMOTION",
        failure_reason: "Couldn't check this coupon. Please try again.",
      },
    };
  }
  await logExchange(request, text, body, answer);
  return Response.json(answer.body, { status: answer.status });
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

/*
 * TEMPORARY, while the Magic Checkout coupon integration is being checked:
 * what Razorpay sends and what we answer, in the logs and in payload_kv
 * (`debug:magic-coupon:*`). The phone and email are left out. Remove once
 * coupons work in Razorpay's window.
 */
async function logExchange(
  request: Request,
  text: string,
  body: unknown,
  answer: { status: number; body: unknown },
) {
  const fields: Record<string, unknown> =
    body && typeof body === "object" ? { ...body } : {};
  delete fields.contact;
  delete fields.email;
  const entry = {
    at: new Date().toISOString(),
    contentType: request.headers.get("content-type"),
    userAgent: request.headers.get("user-agent"),
    fields,
    ...(body === null && { raw: text.slice(0, 300) }),
    answer,
  };
  console.info("Magic coupon", JSON.stringify(entry));
  try {
    const payload = await getPayloadClient();
    await payload.kv.set(`debug:magic-coupon:${Date.now()}`, entry);
  } catch (error) {
    console.error("Couldn't save the Magic coupon log", error);
  }
}
