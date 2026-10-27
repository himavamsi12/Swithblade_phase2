import "server-only";
import { z } from "zod";

/*
 * Transactional email through Resend's HTTP API. Email is disabled, not
 * broken, while the keys are unset.
 */
const schema = z.object({
  RESEND_API_KEY: z.string().min(1).optional(),
  /** A sender on a domain verified in Resend, e.g. "Swithblade <orders@…>". */
  EMAIL_FROM: z.string().min(1).optional(),
  /** Where replies go, e.g. a support inbox. */
  EMAIL_REPLY_TO: z.email().optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(
    `Invalid email environment variables:\n${z.prettifyError(parsed.error)}`,
  );
}
const {
  RESEND_API_KEY: apiKey,
  EMAIL_FROM: from,
  EMAIL_REPLY_TO: replyTo,
} = parsed.data;

const TIMEOUT_MS = 8_000;

export const emailEnabled = () => Boolean(apiKey && from);

export type Email = {
  to: string;
  subject: string;
  html: string;
  text: string;
  /** Resend drops repeats of the same key for 24 hours. */
  idempotencyKey: string;
};

/** Sends one email; throws with Resend's message on failure. */
export async function sendEmail(email: Email): Promise<{ id: string }> {
  if (!apiKey || !from) throw new Error("Email is not configured");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": email.idempotencyKey,
    },
    body: JSON.stringify({
      from,
      to: [email.to],
      subject: email.subject,
      html: email.html,
      text: email.text,
      ...(replyTo && { reply_to: replyTo }),
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const body = (await res.json().catch(() => null)) as {
    id?: string;
    message?: string;
  } | null;
  if (!res.ok || !body?.id) {
    throw new Error(`Resend ${res.status}: ${body?.message ?? "no response"}`);
  }
  return { id: body.id };
}
