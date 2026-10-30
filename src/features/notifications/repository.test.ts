import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Order confirmation emails and staff alerts: one email per order, the
 * result noted on the order without losing what Shiprocket wrote there, and
 * never an error that could touch a paid order.
 */

let order: {
  id: number;
  displayId: number;
  customerEmail: string | null;
  metadata: Record<string, unknown> | null;
};
const payload = {
  findByID: vi.fn(async () => structuredClone(order)),
  update: vi.fn(
    async ({ data }: { data: { metadata: Record<string, unknown> } }) => {
      order.metadata = data.metadata;
    },
  ),
};

let enabled = true;
let alertInbox: string | null = "staff@example.com";
const sendEmail = vi.fn();
vi.mock("server-only", () => ({}));
vi.mock("@/features/account/customer", () => ({
  getPayloadClient: async () => payload,
}));
vi.mock("./email", () => ({
  emailEnabled: () => enabled,
  staffAlertEmail: () => alertInbox,
  sendEmail,
}));
vi.mock("./order-confirmation-email", () => ({
  orderConfirmationEmail: () => ({
    subject: "Order confirmed",
    html: "<p>Thanks</p>",
    text: "Thanks",
  }),
}));

const {
  notifyOrderPlaced,
  orderPlacedEmailPending,
  orderPlacedEmailError,
  sendStaffAlert,
} = await import("./repository");

beforeEach(() => {
  vi.clearAllMocks();
  enabled = true;
  alertInbox = "staff@example.com";
  order = {
    id: 9,
    displayId: 1009,
    customerEmail: "asha@example.com",
    metadata: {},
  };
  sendEmail.mockResolvedValue({ id: "email_1" });
});

describe("notifyOrderPlaced", () => {
  it("emails the shopper once, with a key that stops duplicates", async () => {
    await notifyOrderPlaced(9);
    await notifyOrderPlaced(9);

    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "asha@example.com",
        subject: "Order confirmed",
        idempotencyKey: "order-placed/9",
      }),
    );
    expect(orderPlacedEmailPending(order.metadata)).toBe(false);
  });

  it("keeps the Shiprocket result written while the email was sending", async () => {
    sendEmail.mockImplementationOnce(async () => {
      order.metadata = { shiprocket: { orderId: "SR1" } };
      return { id: "email_1" };
    });

    await notifyOrderPlaced(9);

    expect(order.metadata).toMatchObject({
      shiprocket: { orderId: "SR1" },
      notifications: { orderPlaced: { email: { id: "email_1" } } },
    });
  });

  it("notes a failed send so the retry job tries again", async () => {
    sendEmail.mockRejectedValueOnce(new Error("Resend 500: busy"));

    await expect(notifyOrderPlaced(9)).resolves.toBeUndefined();
    expect(orderPlacedEmailError(order.metadata)).toBe("Resend 500: busy");

    await notifyOrderPlaced(9);
    expect(sendEmail).toHaveBeenCalledTimes(2);
    expect(orderPlacedEmailPending(order.metadata)).toBe(false);
  });

  it("notes an order with no email address instead of sending", async () => {
    order.customerEmail = null;
    await notifyOrderPlaced(9);
    expect(sendEmail).not.toHaveBeenCalled();
    expect(orderPlacedEmailError(order.metadata)).toBe(
      "Order has no email address",
    );
  });

  it("swallows a database outage rather than failing the caller", async () => {
    payload.findByID.mockRejectedValueOnce(new Error("db down"));
    await expect(notifyOrderPlaced(9)).resolves.toBeUndefined();
  });

  it("does nothing while email isn't set up", async () => {
    enabled = false;
    await notifyOrderPlaced(9);
    expect(payload.findByID).not.toHaveBeenCalled();
    expect(orderPlacedEmailPending({})).toBe(false);
  });
});

describe("sendStaffAlert", () => {
  const alert = {
    subject: "1 order needs attention",
    lines: ["SB-1009: <Shiprocket> failed"],
    idempotencyKey: "order-alert/9",
  };

  it("emails the staff inbox, escaping the text in the HTML version", async () => {
    expect(await sendStaffAlert(alert)).toBe(true);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "staff@example.com",
        text: "SB-1009: <Shiprocket> failed",
        html: expect.stringContaining("SB-1009: &lt;Shiprocket&gt; failed"),
      }),
    );
  });

  it("reports false when alerts are off or the send fails", async () => {
    alertInbox = null;
    expect(await sendStaffAlert(alert)).toBe(false);

    alertInbox = "staff@example.com";
    sendEmail.mockRejectedValueOnce(new Error("down"));
    expect(await sendStaffAlert(alert)).toBe(false);
  });
});
