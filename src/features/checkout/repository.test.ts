import { beforeEach, describe, expect, it, vi } from "vitest";
import { encodeAddressNotes } from "./address";

/*
 * Turning a Razorpay payment into an order, against an in-memory stand-in
 * for Payload and a fake Razorpay. Covers the money path: what gets saved,
 * what's refused, and that callers racing on one payment save it once.
 */

type Doc = Record<string, unknown> & { id: number };
let db: Record<string, Doc[]>;
let nextId: number;

const matches = (doc: Doc, where: unknown): boolean => {
  if (!where || typeof where !== "object") return true;
  const w = where as Record<string, unknown>;
  if (Array.isArray(w.and)) return w.and.every((c) => matches(doc, c));
  return Object.entries(w).every(([field, cond]) => {
    const { equals } = cond as { equals?: unknown };
    return doc[field] === equals || (equals === "" && doc[field] == null);
  });
};

const payload = {
  find: vi.fn(
    async ({ collection, where }: { collection: string; where?: unknown }) => {
      const docs = (db[collection] ?? []).filter((d) => matches(d, where));
      return { docs, totalDocs: docs.length };
    },
  ),
  findByID: vi.fn(
    async ({ collection, id }: { collection: string; id: number }) => {
      const doc = (db[collection] ?? []).find((d) => d.id === id);
      if (!doc) throw new Error("Not Found");
      return doc;
    },
  ),
  count: vi.fn(
    async ({ collection, where }: { collection: string; where?: unknown }) => ({
      totalDocs: (db[collection] ?? []).filter((d) => matches(d, where)).length,
    }),
  ),
  create: vi.fn(
    async ({
      collection,
      data,
    }: {
      collection: string;
      data: Record<string, unknown>;
    }) => {
      if (
        collection === "orders" &&
        db.orders!.some((o) => o.razorpayOrderId === data.razorpayOrderId)
      ) {
        throw new Error("duplicate key value violates unique constraint");
      }
      const doc: Doc = { ...data, id: nextId++ };
      if (collection === "orders") doc.displayId = 1000 + doc.id;
      (db[collection] ??= []).push(doc);
      return doc;
    },
  ),
  update: vi.fn(
    async ({
      collection,
      id,
      data,
    }: {
      collection: string;
      id: number;
      data: object;
    }) => {
      const doc = db[collection]!.find((d) => d.id === id)!;
      Object.assign(doc, data);
      return doc;
    },
  ),
};

vi.mock("server-only", () => ({}));
vi.mock("payload", () => ({
  createLocalReq: vi.fn(async () => ({})),
  initTransaction: vi.fn(async () => true),
  commitTransaction: vi.fn(async () => {}),
  killTransaction: vi.fn(async () => {}),
}));
vi.mock("@/features/account/customer", () => ({
  getPayloadClient: async () => payload,
}));
vi.mock("@/features/catalog/repository", () => ({
  getProductBySlug: vi.fn(async (slug: string) => ({
    slug,
    name: "2JZ Tee",
    image: "/red.png",
    colors: [
      { name: "Red", swatch: "#f00", image: "/red.png" },
      { name: "Blue", swatch: "#00f", image: "/blue.png" },
    ],
  })),
}));
const takeStock = vi.fn(async (): Promise<string[]> => []);
vi.mock("@/features/stock/repository", () => ({ takeStock }));
vi.mock("@/payload/transaction", () => ({ lockKey: vi.fn(async () => {}) }));

type Payment = {
  id: string;
  order_id: string;
  status: string;
  amount: number;
  currency: string;
  email?: string;
  contact?: string;
  method?: string;
};
let payment: Payment;
let rzpOrder: { id: string; notes: Record<string, string> };
const razorpay = {
  payments: {
    fetch: vi.fn(async () => ({ ...payment })),
    capture: vi.fn(async () => {
      payment.status = "captured";
    }),
  },
  orders: { fetch: vi.fn(async () => rzpOrder) },
};
vi.mock("./razorpay", () => ({ razorpayClient: () => razorpay }));

const { recordRazorpayPayment } = await import("./repository");
const config = { keyId: "rzp_test", keySecret: "secret" };

const cartNotes = (lines: unknown[][]) => ({ cart0: JSON.stringify(lines) });
const addressNotes = encodeAddressNotes({
  email: "a@example.com",
  fullName: "Asha Rao",
  phone: "9876543210",
  addressLine1: "12 MG Road",
  addressLine2: null,
  city: "Bengaluru",
  state: "Karnataka",
  pincode: "560001",
})!;

beforeEach(() => {
  vi.clearAllMocks();
  db = { orders: [], transactions: [], customers: [], addresses: [] };
  nextId = 1;
  payment = {
    id: "pay_1",
    order_id: "order_1",
    status: "captured",
    amount: 199900,
    currency: "INR",
    email: "asha@example.com",
    contact: "+919876543210",
    method: "upi",
  };
  rzpOrder = {
    id: "order_1",
    notes: {
      ...cartNotes([["2jz-tee", "Blue", "M", 1, 199900]]),
      ...addressNotes,
      email: "asha@example.com",
    },
  };
});

describe("recordRazorpayPayment", () => {
  it("saves a paid order with its items, address, payment and customer", async () => {
    const result = await recordRazorpayPayment(config, "order_1", "pay_1");

    expect(result).toEqual({
      status: "recorded",
      orderId: expect.any(Number),
      orderNumber: expect.stringMatching(/^SB-\d+$/),
    });
    const [order] = db.orders!;
    expect(order).toMatchObject({
      razorpayOrderId: "order_1",
      razorpayPaymentId: "pay_1",
      status: "processing",
      paymentStatus: "captured",
      amount: 199900,
      currency: "INR",
      customerEmail: "asha@example.com",
      shippingAddress: {
        firstName: "Asha",
        lastName: "Rao",
        addressLine1: "12 MG Road",
        city: "Bengaluru",
        postalCode: "560001",
        country: "IN",
        phone: "9876543210",
      },
    });
    expect(order!.lineItems).toEqual([
      expect.objectContaining({
        productSlug: "2jz-tee",
        options: "Blue · Size M",
        unitPrice: 199900,
        quantity: 1,
      }),
    ]);
    expect(db.transactions).toHaveLength(1);
    expect(db.transactions![0]).toMatchObject({
      status: "succeeded",
      order: order!.id,
      amount: 199900,
    });
    // A guest is matched or added by email, so the order shows in their
    // account if they sign up later.
    expect(db.customers).toEqual([
      expect.objectContaining({ email: "asha@example.com" }),
    ]);
    expect(takeStock).toHaveBeenCalledWith(
      [
        {
          slug: "2jz-tee",
          color: "Blue",
          size: "M",
          quantity: 1,
          unitPrice: 199900,
        },
      ],
      "order_1",
      expect.anything(),
    );
  });

  it("keeps the photo of the colour bought", async () => {
    await recordRazorpayPayment(config, "order_1", "pay_1");
    expect(db.orders![0]!.lineItems).toEqual([
      expect.objectContaining({ image: "/blue.png" }),
    ]);
  });

  it("puts the order on the signed-in shopper's account", async () => {
    db.customers!.push({ id: 50, email: "member@example.com", firstName: "M" });
    nextId = 51;
    rzpOrder.notes.customer = "50";

    await recordRazorpayPayment(config, "order_1", "pay_1");

    expect(db.orders![0]).toMatchObject({
      customer: 50,
      customerEmail: "member@example.com",
    });
    expect(db.customers).toHaveLength(1);
  });

  it("saves the delivery address to the shopper's address book once", async () => {
    await recordRazorpayPayment(config, "order_1", "pay_1");
    payment = { ...payment, id: "pay_2", order_id: "order_2" };
    rzpOrder = { ...rzpOrder, id: "order_2" };
    await recordRazorpayPayment(config, "order_2", "pay_2");

    expect(db.orders).toHaveLength(2);
    expect(db.addresses).toHaveLength(1);
    expect(db.addresses![0]).toMatchObject({ addressLine1: "12 MG Road" });
  });

  it("uses the email typed at checkout when Razorpay has a placeholder", async () => {
    payment.email = "void@razorpay.com";
    rzpOrder.notes.email = "typed@example.com";

    await recordRazorpayPayment(config, "order_1", "pay_1");

    expect(db.orders![0]!.customerEmail).toBe("typed@example.com");
  });

  it("answers a repeat without asking Razorpay or saving again", async () => {
    await recordRazorpayPayment(config, "order_1", "pay_1");
    razorpay.payments.fetch.mockClear();

    const again = await recordRazorpayPayment(config, "order_1", "pay_1");

    expect(again.status).toBe("duplicate");
    expect(razorpay.payments.fetch).not.toHaveBeenCalled();
    expect(db.orders).toHaveLength(1);
    expect(takeStock).toHaveBeenCalledTimes(1);
  });

  it("saves once when the callback and webhooks arrive together", async () => {
    const results = await Promise.all([
      recordRazorpayPayment(config, "order_1", "pay_1"),
      recordRazorpayPayment(config, "order_1", "pay_1"),
      recordRazorpayPayment(config, "order_1", "pay_1"),
      recordRazorpayPayment(config, "order_1", "pay_1"),
    ]);

    expect(results.map((r) => r.status).sort()).toEqual([
      "duplicate",
      "duplicate",
      "duplicate",
      "recorded",
    ]);
    expect(new Set(results.map((r) => "orderId" in r && r.orderId)).size).toBe(
      1,
    );
    expect(db.orders).toHaveLength(1);
    expect(db.transactions).toHaveLength(1);
    expect(takeStock).toHaveBeenCalledTimes(1);
    expect(razorpay.payments.fetch).toHaveBeenCalledTimes(1);
  });

  it("refuses a payment made for a different order", async () => {
    payment.order_id = "order_other";
    const result = await recordRazorpayPayment(config, "order_1", "pay_1");
    expect(result).toEqual({
      status: "rejected",
      reason: "Payment is for another order",
    });
    expect(db.orders).toHaveLength(0);
  });

  it.each(["failed", "created", "refunded"])(
    "refuses a payment that is %s",
    async (status) => {
      payment.status = status;
      const result = await recordRazorpayPayment(config, "order_1", "pay_1");
      expect(result).toEqual({
        status: "rejected",
        reason: `Payment is ${status}`,
      });
      expect(db.orders).toHaveLength(0);
    },
  );

  it("refuses a currency the store doesn't support", async () => {
    payment.currency = "JPY";
    const result = await recordRazorpayPayment(config, "order_1", "pay_1");
    expect(result.status).toBe("rejected");
  });

  it("refuses a Razorpay order that isn't from this shop's checkout", async () => {
    rzpOrder.notes = { email: "x@example.com" };
    const result = await recordRazorpayPayment(config, "order_1", "pay_1");
    expect(result).toEqual({
      status: "rejected",
      reason: "Order has no cart snapshot",
    });
  });

  it("captures an authorized payment before saving the order", async () => {
    payment.status = "authorized";
    await recordRazorpayPayment(config, "order_1", "pay_1");
    expect(razorpay.payments.capture).toHaveBeenCalledWith(
      "pay_1",
      199900,
      "INR",
    );
    expect(db.orders).toHaveLength(1);
  });

  it("carries on when another caller captured the payment first", async () => {
    payment.status = "authorized";
    razorpay.payments.capture.mockRejectedValueOnce(
      new Error("already captured"),
    );
    razorpay.payments.fetch
      .mockResolvedValueOnce({ ...payment })
      .mockResolvedValueOnce({ ...payment, status: "captured" });

    const result = await recordRazorpayPayment(config, "order_1", "pay_1");

    expect(result.status).toBe("recorded");
  });

  it("saves nothing if the payment can't be captured, so it's retried", async () => {
    payment.status = "authorized";
    razorpay.payments.capture.mockRejectedValueOnce(new Error("gateway down"));

    await expect(
      recordRazorpayPayment(config, "order_1", "pay_1"),
    ).rejects.toThrow("gateway down");
    expect(db.orders).toHaveLength(0);
  });

  it("records an order that sold out while paying and flags it for a refund", async () => {
    takeStock.mockResolvedValueOnce([
      "2JZ Tee (Blue, M): 1 sold, 0 were available",
    ]);

    const result = await recordRazorpayPayment(config, "order_1", "pay_1");

    expect(result.status).toBe("recorded");
    expect(db.orders![0]!.metadata).toMatchObject({
      oversold: ["2JZ Tee (Blue, M): 1 sold, 0 were available"],
    });
  });

  it("rolls back and rethrows when saving fails for another reason", async () => {
    const { killTransaction } = await import("payload");
    payload.create.mockRejectedValueOnce(new Error("database down"));
    // Not the order create: the guest's customer record is made first.
    db.customers!.push({ id: 99, email: "asha@example.com" });
    nextId = 100;

    await expect(
      recordRazorpayPayment(config, "order_1", "pay_1"),
    ).rejects.toThrow("database down");
    expect(killTransaction).toHaveBeenCalled();
    expect(db.orders).toHaveLength(0);
  });
});
