import { describe, expect, it } from "vitest";
import { canRequestReturn, returnRequestHref } from "./return-request";

const now = new Date("2026-10-30T12:00:00.000Z");

describe("canRequestReturn", () => {
  it("allows delivered orders inside the return window", () => {
    expect(canRequestReturn("delivered", "2026-10-25T12:00:00.000Z", now)).toBe(
      true,
    );
  });

  it("refuses once the window has passed", () => {
    expect(canRequestReturn("delivered", "2026-10-20T12:00:00.000Z", now)).toBe(
      false,
    );
  });

  it("refuses orders that aren't delivered", () => {
    expect(canRequestReturn("shipped", null, now)).toBe(false);
    expect(canRequestReturn("processing", null, now)).toBe(false);
  });

  it("allows delivered orders without a delivery date", () => {
    expect(canRequestReturn("delivered", null, now)).toBe(true);
  });
});

describe("returnRequestHref", () => {
  it("fills in the order number and items", () => {
    const href = returnRequestHref("help@example.com", {
      number: "SB-1010",
      items: [{ title: "Tee", options: "Red · Size S", quantity: 1 }],
    });
    expect(href.startsWith("mailto:help@example.com?")).toBe(true);
    expect(href).not.toContain("+");
    const params = new URLSearchParams(href.split("?")[1]);
    expect(params.get("subject")).toBe("Return request: SB-1010");
    expect(params.get("body")).toContain("- Tee (Red · Size S) × 1");
  });
});
