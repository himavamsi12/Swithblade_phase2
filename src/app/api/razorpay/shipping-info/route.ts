import { findMagicOrder } from "@/features/checkout/magic-promotions";
import { decodeCartNotes } from "@/features/checkout/pricing";
import { razorpayClient, razorpayConfig } from "@/features/checkout/razorpay";
import { shippingFor } from "@/features/shipping/rates";
import { listShippingRates } from "@/features/shipping/rates-repository";
import { DEFAULT_PACKAGE } from "@/features/shipping/shiprocket-order";
import {
  isServiceable,
  shiprocketEnabled,
} from "@/features/shipping/shiprocket";
import {
  shippingInfo,
  shippingInfoRequest,
  type ShippingInfoRequest,
} from "@/features/shipping/shipping-info";

export const dynamic = "force-dynamic";

// Razorpay requires this URL to be public and unauthenticated; it only
// answers "do we deliver to this pincode, and for how much", so there is
// nothing to protect.
export async function POST(request: Request) {
  if (!shiprocketEnabled()) return new Response(null, { status: 404 });

  const parsed = shippingInfoRequest.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) return new Response(null, { status: 400 });

  return Response.json(
    await shippingInfo(
      parsed.data,
      (pincode) => isServiceable(pincode, DEFAULT_PACKAGE.weightKg),
      await chargeFor(parsed.data),
    ),
  );
}

/**
 * The delivery charge for the order's bag (its subtotal before coupons).
 * Free if the bag can't be read, rather than charge a big bag the fee.
 */
async function chargeFor(request: ShippingInfoRequest) {
  const rates = await listShippingRates();
  const config = razorpayConfig();
  const order =
    config && (request.order_id || request.razorpay_order_id)
      ? await findMagicOrder(
          razorpayClient(config),
          request.order_id ?? "",
          request.razorpay_order_id,
        ).catch(() => null)
      : null;
  const lines = order ? decodeCartNotes(order.notes) : null;
  if (!lines) {
    console.error(
      "Shipping info: couldn't read the order's bag; quoting free delivery",
      request.order_id,
      request.razorpay_order_id,
    );
    return shippingFor(rates, Number.MAX_SAFE_INTEGER);
  }
  const subtotal = lines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  return shippingFor(rates, subtotal);
}
