import { describe, expect, it } from "vitest";
import { composePhone, flagOf, formatPhone, parsePhone } from "./phone";

describe("phone", () => {
  it("composes E.164-style numbers with a space after the dial code", () => {
    expect(composePhone("IN", "90259 92830")).toBe("+91 9025992830");
    expect(composePhone("IN", "")).toBeNull();
  });

  it("parses back to country and digits", () => {
    const p = parsePhone("+91 9025992830");
    expect(p.country?.code).toBe("IN");
    expect(p.national).toBe("9025992830");
  });

  it("formats for display", () => {
    expect(formatPhone("+91 9025992830")).toBe("+91 90259 92830");
    expect(formatPhone(null)).toBe("");
  });

  it("makes flag emoji", () => {
    expect(flagOf("IN")).toBe("🇮🇳");
  });
});
