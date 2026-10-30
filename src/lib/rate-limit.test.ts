import { beforeEach, describe, expect, it, vi } from "vitest";

/* Rate limits slow abuse, but must never lock shoppers out on an outage. */

vi.mock("server-only", () => ({}));
let forwardedFor: string | null = "203.0.113.5, 10.0.0.1";
vi.mock("next/headers", () => ({
  headers: async () =>
    new Headers(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}),
}));

let redisConfigured = true;
const limit = vi.fn();
vi.mock("./redis", () => ({
  get redis() {
    return redisConfigured ? {} : null;
  },
  REDIS_PREFIX: "sb",
}));
vi.mock("@upstash/ratelimit", () => {
  class Ratelimit {
    static slidingWindow = vi.fn();
    limit = limit;
  }
  return { Ratelimit };
});

async function load() {
  vi.resetModules();
  return import("./rate-limit");
}

beforeEach(() => {
  vi.resetAllMocks();
  redisConfigured = true;
  forwardedFor = "203.0.113.5, 10.0.0.1";
  limit.mockResolvedValue({ success: true });
});

describe("rateLimit", () => {
  it("allows a request under every limit", async () => {
    const { rateLimit } = await load();
    expect(await rateLimit("signIn", "ip:1", "email:A@B.com")).toBe(true);
    // Identifiers are case-insensitive, so A@B.com and a@b.com share a limit.
    expect(limit).toHaveBeenCalledWith("email:a@b.com");
  });

  it("blocks once any identifier is over its limit", async () => {
    limit
      .mockResolvedValueOnce({ success: true })
      .mockResolvedValueOnce({ success: false });
    const { rateLimit } = await load();
    expect(await rateLimit("signIn", "ip:1", "email:a@b.com")).toBe(false);
  });

  it("lets requests through when Redis is down", async () => {
    limit.mockRejectedValue(new Error("ECONNRESET"));
    const { rateLimit } = await load();
    expect(await rateLimit("checkout", "ip:1")).toBe(true);
  });

  it("lets requests through when Redis isn't set up", async () => {
    redisConfigured = false;
    const { rateLimit } = await load();
    expect(await rateLimit("otpSend", "ip:1")).toBe(true);
    expect(limit).not.toHaveBeenCalled();
  });
});

describe("clientIp", () => {
  it("takes the client's address, not the proxy chain", async () => {
    const { clientIp } = await load();
    expect(await clientIp()).toBe("203.0.113.5");
  });

  it("falls back to 'unknown' without proxy headers", async () => {
    forwardedFor = null;
    const { clientIp } = await load();
    expect(await clientIp()).toBe("unknown");
  });
});
