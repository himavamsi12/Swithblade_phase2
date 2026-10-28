import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { isAuthorizedCron } = await import("./cron");

describe("isAuthorizedCron", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("accepts only the exact bearer secret", () => {
    vi.stubEnv("CRON_SECRET", "s3cret");
    expect(isAuthorizedCron("Bearer s3cret")).toBe(true);
    expect(isAuthorizedCron("Bearer wrong")).toBe(false);
    expect(isAuthorizedCron("s3cret")).toBe(false);
    expect(isAuthorizedCron(null)).toBe(false);
  });

  it("stays closed while no secret is configured", () => {
    vi.stubEnv("CRON_SECRET", "");
    expect(isAuthorizedCron("Bearer ")).toBe(false);
    expect(isAuthorizedCron("Bearer undefined")).toBe(false);
  });
});
