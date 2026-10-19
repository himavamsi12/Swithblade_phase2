import { handleRazorpayWebhook } from "@/features/checkout/webhook";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // The signature covers the raw body, so read it as text before parsing.
  const status = await handleRazorpayWebhook(
    await request.text(),
    request.headers.get("x-razorpay-signature"),
  );
  return new Response(null, { status });
}
