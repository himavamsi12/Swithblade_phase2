import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const findGlobal = vi.fn();
vi.mock("@/features/account/customer", () => ({
  getPayloadClient: async () => ({ findGlobal }),
}));

const { getCheckoutStatus } = await import("./repository");

describe("getCheckoutStatus", () => {
  beforeEach(() => {
    findGlobal.mockReset();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("is open when the switch is off", async () => {
    findGlobal.mockResolvedValue({ checkoutPaused: false });
    expect(await getCheckoutStatus()).toEqual({ open: true });
  });

  it("is closed with the staff message when paused", async () => {
    findGlobal.mockResolvedValue({
      checkoutPaused: true,
      checkoutPausedMessage: "Back at 6 pm.",
    });
    expect(await getCheckoutStatus()).toEqual({
      open: false,
      message: "Back at 6 pm.",
    });
  });

  it("falls back to a default message when none is set", async () => {
    findGlobal.mockResolvedValue({
      checkoutPaused: true,
      checkoutPausedMessage: " ",
    });
    const status = await getCheckoutStatus();
    expect(status.open).toBe(false);
    expect(!status.open && status.message).toMatch(/paused/);
  });

  it("stays open if the settings can't be read", async () => {
    findGlobal.mockRejectedValue(new Error("db down"));
    expect(await getCheckoutStatus()).toEqual({ open: true });
  });
});
