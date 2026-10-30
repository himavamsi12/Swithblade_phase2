import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Sign-in, sign-up, phone codes and password resets against a fake
 * Supabase. Covers each answer a shopper can get, and that limits and
 * outages give a clear message instead of an error page.
 */

class Redirect extends Error {
  constructor(public url: string) {
    super(`NEXT_REDIRECT ${url}`);
  }
}
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Redirect(url);
  },
}));
let allowed = true;
const rateLimit = vi.fn(async () => allowed);
vi.mock("@/lib/rate-limit", () => ({
  clientIp: async () => "203.0.113.5",
  rateLimit,
}));
let providerOn = true;
vi.mock("@/lib/supabase", () => ({
  isAuthProviderEnabled: async () => providerOn,
}));

type AuthResult = {
  data?: unknown;
  error: { code: string; message?: string } | null;
};
const auth = {
  signInWithPassword: vi.fn(async (): Promise<AuthResult> => ({ error: null })),
  signUp: vi.fn(async (): Promise<AuthResult> => ({ data: {}, error: null })),
  signInWithOtp: vi.fn(async (): Promise<AuthResult> => ({ error: null })),
  verifyOtp: vi.fn(async (): Promise<AuthResult> => ({ error: null })),
  resetPasswordForEmail: vi.fn(async (): Promise<AuthResult> => ({
    error: null,
  })),
  updateUser: vi.fn(async (): Promise<AuthResult> => ({ error: null })),
};
vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: async () => ({ auth }),
}));

const {
  continueWithEmail,
  continueWithPhone,
  sendPasswordReset,
  updatePassword,
} = await import("./actions");

const idle = { status: "idle" as const };
const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
};
const err = (code: string, message = code) => ({ error: { code, message } });

/** Runs an action that may redirect, returning the URL it went to. */
async function redirectOf(run: () => Promise<unknown>) {
  try {
    await run();
  } catch (error) {
    if (error instanceof Redirect) return error.url;
    throw error;
  }
  return null;
}

beforeEach(() => {
  vi.clearAllMocks();
  allowed = true;
  providerOn = true;
});

describe("continueWithEmail", () => {
  const creds = { email: " Asha@Example.com ", password: "correct-horse" };

  it("signs in and goes to the account page", async () => {
    const url = await redirectOf(() => continueWithEmail(idle, form(creds)));
    expect(url).toBe("/account");
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: "asha@example.com",
      password: "correct-horse",
    });
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  it("creates an account for a new email and asks to confirm it", async () => {
    auth.signInWithPassword.mockResolvedValueOnce(err("invalid_credentials"));
    auth.signUp.mockResolvedValueOnce({
      data: { user: { identities: [{}] }, session: null },
      error: null,
    });

    const state = await continueWithEmail(idle, form(creds));

    expect(state).toEqual({
      status: "success",
      email: "asha@example.com",
      message:
        "Account created. We sent a confirmation link to asha@example.com.",
    });
    expect(auth.signUp).toHaveBeenCalledWith(
      expect.objectContaining({
        options: {
          emailRedirectTo: "https://shop.example/auth/callback?next=/account",
        },
      }),
    );
  });

  it("signs a new account straight in when confirmation is off", async () => {
    auth.signInWithPassword.mockResolvedValueOnce(err("invalid_credentials"));
    auth.signUp.mockResolvedValueOnce({
      data: { user: { identities: [{}] }, session: {} },
      error: null,
    });
    expect(await redirectOf(() => continueWithEmail(idle, form(creds)))).toBe(
      "/account",
    );
  });

  it("says wrong password for an existing account, without saying it exists", async () => {
    auth.signInWithPassword.mockResolvedValueOnce(err("invalid_credentials"));
    auth.signUp.mockResolvedValueOnce({
      data: { user: { identities: [] }, session: null },
      error: null,
    });
    const state = await continueWithEmail(idle, form(creds));
    expect(state.message).toBe("Incorrect email or password.");
  });

  it("asks to confirm the email before signing in", async () => {
    auth.signInWithPassword.mockResolvedValueOnce(err("email_not_confirmed"));
    const state = await continueWithEmail(idle, form(creds));
    expect(state.message).toBe(
      "Please confirm your email first. Check your inbox for the link.",
    );
  });

  it("passes on Supabase's weak-password advice", async () => {
    auth.signInWithPassword.mockResolvedValueOnce(err("invalid_credentials"));
    auth.signUp.mockResolvedValueOnce(
      err("weak_password", "Password is known to be weak."),
    );
    const state = await continueWithEmail(idle, form(creds));
    expect(state.message).toBe("Password is known to be weak.");
  });

  it("checks the form before calling Supabase", async () => {
    const state = await continueWithEmail(
      idle,
      form({ email: "not-an-email", password: "short" }),
    );
    expect(state.fieldErrors).toEqual({
      email: "Enter a valid email address.",
      password: "Password must be at least 8 characters.",
    });
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("limits attempts per address and per email", async () => {
    allowed = false;
    const state = await continueWithEmail(idle, form(creds));
    expect(state.message).toBe(
      "Too many attempts. Please wait a few minutes and try again.",
    );
    expect(rateLimit).toHaveBeenCalledWith(
      "signIn",
      "ip:203.0.113.5",
      "email:asha@example.com",
    );
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  it("gives a general message for an unexpected Supabase error", async () => {
    auth.signInWithPassword.mockResolvedValueOnce(err("unexpected_failure"));
    const state = await continueWithEmail(idle, form(creds));
    expect(state.message).toBe("Something went wrong. Please try again.");
  });
});

describe("continueWithPhone", () => {
  it("texts a code to the number in E.164", async () => {
    const state = await continueWithPhone(
      idle,
      form({ phone: "98765 43210", step: "send" }),
    );
    expect(auth.signInWithOtp).toHaveBeenCalledWith({ phone: "+919876543210" });
    expect(state).toMatchObject({
      status: "success",
      phone: "+919876543210",
      message: "We sent a 6-digit code to +91 98765 43210.",
    });
  });

  it("signs in with the right code", async () => {
    const url = await redirectOf(() =>
      continueWithPhone(
        idle,
        form({
          phone: "9876543210",
          step: "verify",
          otp: "123456",
          sentAt: "1",
        }),
      ),
    );
    expect(url).toBe("/account");
    expect(auth.verifyOtp).toHaveBeenCalledWith({
      phone: "+919876543210",
      token: "123456",
      type: "sms",
    });
  });

  it("keeps the shopper on the code screen after a wrong code", async () => {
    auth.verifyOtp.mockResolvedValueOnce(err("otp_expired"));
    const state = await continueWithPhone(
      idle,
      form({
        phone: "9876543210",
        step: "verify",
        otp: "000000",
        sentAt: "1700",
      }),
    );
    expect(state).toMatchObject({
      status: "error",
      phone: "+919876543210",
      sentAt: 1700,
      fieldErrors: {
        otp: "That code is wrong or has expired. Check it, or send a new one.",
      },
    });
  });

  it.each([
    ["a landline", { phone: "0221234567", step: "send" }, "phone"],
    ["a dummy number", { phone: "9999999999", step: "send" }, "phone"],
    [
      "a 4-digit code",
      { phone: "9876543210", step: "verify", otp: "1234" },
      "otp",
    ],
  ])("refuses %s", async (_, fields, field) => {
    const state = await continueWithPhone(idle, form(fields));
    expect(state.fieldErrors).toHaveProperty(field);
    expect(auth.signInWithOtp).not.toHaveBeenCalled();
    expect(auth.verifyOtp).not.toHaveBeenCalled();
  });

  it("limits code texts, which cost money", async () => {
    allowed = false;
    const state = await continueWithPhone(
      idle,
      form({ phone: "9876543210", step: "send" }),
    );
    expect(state.message).toBe(
      "Too many attempts. Please wait a few minutes and try again.",
    );
    expect(auth.signInWithOtp).not.toHaveBeenCalled();
  });

  it("explains when phone sign-in isn't switched on", async () => {
    providerOn = false;
    const state = await continueWithPhone(
      idle,
      form({ phone: "9876543210", step: "send" }),
    );
    expect(state.message).toBe(
      "Phone sign-in isn't available yet. Please continue with email.",
    );
  });

  it("explains Supabase's SMS limit", async () => {
    auth.signInWithOtp.mockResolvedValueOnce(err("over_sms_send_rate_limit"));
    const state = await continueWithPhone(
      idle,
      form({ phone: "9876543210", step: "send" }),
    );
    expect(state.message).toBe(
      "Too many codes sent. Please wait a minute and try again.",
    );
  });
});

describe("sendPasswordReset", () => {
  it("gives the same answer whether or not the account exists", async () => {
    const state = await sendPasswordReset(
      idle,
      form({ email: "who@example.com" }),
    );
    expect(state).toEqual({
      status: "success",
      email: "who@example.com",
      message:
        "If an account exists for who@example.com, a reset link is on its way.",
    });
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith("who@example.com", {
      redirectTo:
        "https://shop.example/auth/callback?next=/account/reset-password",
    });
  });

  it("is limited, so the form can't be used to spam inboxes", async () => {
    allowed = false;
    const state = await sendPasswordReset(idle, form({ email: "a@b.com" }));
    expect(state.status).toBe("error");
    expect(auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });
});

describe("updatePassword", () => {
  it("sets the new password and goes to the account", async () => {
    const url = await redirectOf(() =>
      updatePassword(
        idle,
        form({ password: "new-password-1", confirm: "new-password-1" }),
      ),
    );
    expect(url).toBe("/account");
  });

  it("catches a mistyped confirmation", async () => {
    const state = await updatePassword(
      idle,
      form({ password: "new-password-1", confirm: "new-password-2" }),
    );
    expect(state.fieldErrors).toEqual({ confirm: "Passwords don't match." });
    expect(auth.updateUser).not.toHaveBeenCalled();
  });

  it("explains an expired reset link", async () => {
    auth.updateUser.mockResolvedValueOnce(err("session_not_found"));
    const state = await updatePassword(
      idle,
      form({ password: "new-password-1", confirm: "new-password-1" }),
    );
    expect(state.message).toBe(
      "Your reset link has expired. Request a new one.",
    );
  });
});
