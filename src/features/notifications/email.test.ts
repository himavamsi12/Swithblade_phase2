import { afterEach, describe, expect, it, vi } from "vitest";

/* The Resend client: what it sends, and how failures surface. */

vi.mock("server-only", () => ({}));

async function loadEmail(env: Record<string, string | undefined>) {
  vi.resetModules();
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  return import("./email");
}

const configured = {
  RESEND_API_KEY: "re_test",
  EMAIL_FROM: "Shop <orders@shop.example>",
  EMAIL_REPLY_TO: "help@shop.example",
  STORE_ALERT_EMAIL: "staff@shop.example",
};

const message = {
  to: "asha@example.com",
  subject: "Hi",
  html: "<p>Hi</p>",
  text: "Hi",
  idempotencyKey: "order-placed/1",
};

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("sendEmail", () => {
  it("posts to Resend with the idempotency key and reply-to", async () => {
    const fetchMock = vi.fn(async () =>
      Response.json({ id: "email_1" }, { status: 200 }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { sendEmail } = await loadEmail(configured);

    expect(await sendEmail(message)).toEqual({ id: "email_1" });

    const [url, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(url).toBe("https://api.resend.com/emails");
    expect(new Headers(init.headers).get("Idempotency-Key")).toBe(
      "order-placed/1",
    );
    expect(JSON.parse(init.body as string)).toMatchObject({
      from: "Shop <orders@shop.example>",
      to: ["asha@example.com"],
      reply_to: "help@shop.example",
    });
  });

  it("throws with Resend's message when sending fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ message: "Domain not verified" }, { status: 403 }),
      ),
    );
    const { sendEmail } = await loadEmail(configured);

    await expect(sendEmail(message)).rejects.toThrow(
      "Resend 403: Domain not verified",
    );
  });

  it("is off, not broken, without keys", async () => {
    const email = await loadEmail({
      RESEND_API_KEY: undefined,
      EMAIL_FROM: undefined,
    });
    expect(email.emailEnabled()).toBe(false);
    expect(email.staffAlertEmail()).toBeNull();
    await expect(email.sendEmail(message)).rejects.toThrow(
      "Email is not configured",
    );
  });

  it("refuses to start with a malformed alert address", async () => {
    await expect(
      loadEmail({ ...configured, STORE_ALERT_EMAIL: "not-an-email" }),
    ).rejects.toThrow("Invalid email environment variables");
  });
});
