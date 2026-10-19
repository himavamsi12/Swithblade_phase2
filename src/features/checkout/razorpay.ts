import "server-only";
import Razorpay from "razorpay";
import {
  validatePaymentVerification,
  validateWebhookSignature,
} from "razorpay/dist/utils/razorpay-utils";
import { z } from "zod";

/*
 * Razorpay (Magic Checkout) credentials. The key secret never leaves the
 * server; the key id is public and handed to the browser per checkout.
 * Checkout is disabled, not broken, while the keys are unset.
 */
const schema = z.object({
  RAZORPAY_KEY_ID: z.string().min(1).optional(),
  RAZORPAY_KEY_SECRET: z.string().min(1).optional(),
  /** Set in Dashboard → Webhooks; enables `/api/razorpay/webhook`. */
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1).optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(
    `Invalid Razorpay environment variables:\n${z.prettifyError(parsed.error)}`,
  );
}
const {
  RAZORPAY_KEY_ID: keyId,
  RAZORPAY_KEY_SECRET: keySecret,
  RAZORPAY_WEBHOOK_SECRET: webhookSecret,
} = parsed.data;

export type RazorpayConfig = { keyId: string; keySecret: string };

export function razorpayConfig(): RazorpayConfig | null {
  return keyId && keySecret ? { keyId, keySecret } : null;
}

let client: Razorpay | undefined;

export function razorpayClient({ keyId, keySecret }: RazorpayConfig) {
  client ??= new Razorpay({ key_id: keyId, key_secret: keySecret });
  return client;
}

/** Checks the signature Razorpay's checkout returns after a payment. */
export function isValidPaymentSignature(
  { keySecret }: RazorpayConfig,
  orderId: string,
  paymentId: string,
  signature: string,
): boolean {
  try {
    return validatePaymentVerification(
      { order_id: orderId, payment_id: paymentId },
      signature,
      keySecret,
    );
  } catch {
    return false;
  }
}

/** Checks a webhook body against Razorpay's signature header. */
export function isValidWebhook(body: string, signature: string): boolean {
  if (!webhookSecret) return false;
  try {
    return validateWebhookSignature(body, signature, webhookSecret);
  } catch {
    return false;
  }
}

export const webhooksEnabled = () => Boolean(webhookSecret);
