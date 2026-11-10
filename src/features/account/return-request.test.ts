import { describe, expect, it } from "vitest";
import {
  canRequestReturn,
  orderReasons,
  orderReturnBadge,
  returnedByLine,
  returnRequestHref,
  returnSteps,
  type ReturnStatus,
} from "./return-request";

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

describe("returnedByLine", () => {
  it("counts items in returns that still hold them", () => {
    const returned = returnedByLine([
      { status: "requested", items: [{ lineId: "a", quantity: 1 }] },
      { status: "refunded", items: [{ lineId: "a", quantity: 1 }] },
      { status: "approved", items: [{ lineId: "b", quantity: 2 }] },
    ]);
    expect(Object.fromEntries(returned)).toEqual({ a: 2, b: 2 });
  });

  it("frees items from rejected and cancelled returns", () => {
    const returned = returnedByLine([
      { status: "rejected", items: [{ lineId: "a", quantity: 1 }] },
      { status: "canceled", items: [{ lineId: "a", quantity: 1 }] },
    ]);
    expect(returned.size).toBe(0);
  });

  it("ignores items made in the admin without a line", () => {
    const returned = returnedByLine([
      { status: "requested", items: [{ lineId: null, quantity: 1 }] },
    ]);
    expect(returned.size).toBe(0);
  });
});

describe("returnSteps", () => {
  const states = (status: ReturnStatus) =>
    returnSteps({
      status,
      createdAt: "2026-11-01T10:00:00.000Z",
      approvedAt: "2026-11-02T10:00:00.000Z",
      receivedAt: "2026-11-04T10:00:00.000Z",
      refundedAt: "2026-11-05T10:00:00.000Z",
    }).map((s) => `${s.key}:${s.state}`);

  it("shows a new request under review", () => {
    expect(states("requested")).toEqual([
      "submitted:done",
      "review:current",
      "approved:upcoming",
      "refunded:upcoming",
    ]);
  });

  it("moves to approved, then received, then refunded", () => {
    expect(states("approved")).toEqual([
      "submitted:done",
      "review:done",
      "approved:current",
      "refunded:upcoming",
    ]);
    expect(states("received")[2]).toBe("approved:current");
    expect(states("refunded")).toEqual([
      "submitted:done",
      "review:done",
      "approved:done",
      "refunded:done",
    ]);
  });

  it("says when a return wasn't approved", () => {
    const steps = returnSteps({
      status: "rejected",
      createdAt: "2026-11-01T10:00:00.000Z",
      approvedAt: null,
      receivedAt: null,
      refundedAt: null,
    });
    expect(steps[1]).toMatchObject({ state: "failed", label: "Not approved" });
    expect(steps.slice(2).every((s) => s.state === "upcoming")).toBe(true);
  });

  it("dates the approved step by when it was received, once it was", () => {
    const [, , approved] = returnSteps({
      status: "received",
      createdAt: "2026-11-01T10:00:00.000Z",
      approvedAt: "2026-11-02T10:00:00.000Z",
      receivedAt: "2026-11-04T10:00:00.000Z",
      refundedAt: null,
    });
    expect(approved).toMatchObject({
      label: "Return received",
      at: "2026-11-04T10:00:00.000Z",
    });
  });
});

describe("orderReasons", () => {
  it("keeps the order staff added them, with Other last", () => {
    const ordered = orderReasons([
      { id: 4, value: "other" },
      { id: 2, value: "damaged" },
      { id: 1, value: "size_fit" },
      { id: 5, value: "late" },
    ]);
    expect(ordered.map((r) => r.value)).toEqual([
      "size_fit",
      "damaged",
      "late",
      "other",
    ]);
  });
});

describe("orderReturnBadge", () => {
  const of = (...statuses: ReturnStatus[]) =>
    orderReturnBadge(statuses.map((status) => ({ status })));

  it("shows nothing without returns", () => {
    expect(of()).toBeNull();
  });

  it("shows processing while any return is open", () => {
    expect(of("requested")).toBe("processing");
    expect(of("approved")).toBe("processing");
    expect(of("partially_received")).toBe("processing");
    expect(of("refunded", "received")).toBe("processing");
  });

  it("shows refunded when the newest return was refunded", () => {
    expect(of("refunded")).toBe("refunded");
    expect(of("rejected", "refunded")).toBeNull();
  });

  it("shows nothing for rejected or cancelled returns", () => {
    expect(of("rejected")).toBeNull();
    expect(of("canceled")).toBeNull();
  });
});
