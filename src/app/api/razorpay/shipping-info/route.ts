import { DEFAULT_PACKAGE } from "@/features/shipping/shiprocket-order";
import {
  isServiceable,
  shiprocketEnabled,
} from "@/features/shipping/shiprocket";
import {
  shippingInfo,
  shippingInfoRequest,
} from "@/features/shipping/shipping-info";

export const dynamic = "force-dynamic";

// Razorpay requires this URL to be public and unauthenticated; it only
// answers "do we deliver to this pincode", so there is nothing to protect.
export async function POST(request: Request) {
  if (!shiprocketEnabled()) return new Response(null, { status: 404 });

  const parsed = shippingInfoRequest.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return new Response(null, { status: 400 });

  return Response.json(
    await shippingInfo(parsed.data, (pincode) =>
      isServiceable(pincode, DEFAULT_PACKAGE.weightKg),
    ),
  );
}
