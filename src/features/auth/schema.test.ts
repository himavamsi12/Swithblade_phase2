import { describe, expect, it } from "vitest";
import { credentialsSchema, otpSchema, phoneSchema } from "./schema";

describe("credentialsSchema", () => {
  const password = "correct-horse";

  it("trims and lowercases the email before checking it", () => {
    expect(
      credentialsSchema.parse({ email: "  Asha@Example.com ", password }),
    ).toEqual({ email: "asha@example.com", password });
  });

  it("rejects malformed emails", () => {
    expect(
      credentialsSchema.safeParse({ email: "asha@", password }).success,
    ).toBe(false);
  });
});

describe("phoneSchema", () => {
  it("turns an Indian mobile into E.164", () => {
    expect(phoneSchema.parse("98765 43210")).toBe("+919876543210");
    expect(phoneSchema.parse("+91 98765-43210")).toBe("+919876543210");
  });

  it("rejects numbers that aren't Indian mobiles", () => {
    expect(phoneSchema.safeParse("12345").success).toBe(false);
    expect(phoneSchema.safeParse("5876543210").success).toBe(false);
  });
});

describe("otpSchema", () => {
  it("accepts exactly six digits", () => {
    expect(otpSchema.parse(" 123456 ")).toBe("123456");
    expect(otpSchema.safeParse("12345").success).toBe(false);
    expect(otpSchema.safeParse("12a456").success).toBe(false);
  });
});
