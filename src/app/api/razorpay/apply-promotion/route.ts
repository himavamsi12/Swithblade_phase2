import { applyMagicPromotion } from "@/features/checkout/magic-promotions";

export const dynamic = "force-dynamic";

// Magic Checkout's "apply promotions" URL: checks the code a shopper typed in
// Razorpay's window against the store's coupons for that order's bag.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  try {
    const result = await applyMagicPromotion(body);
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
