import { beforeEach, describe, expect, it, vi } from "vitest";
import { encodeAddressNotes } from "./address";

/*
 * Turning a Razorpay payment into an order, against an in-memory stand-in
 * for Payload and a fake Razorpay. Covers the money path: what gets saved,
 * what's refused, and that callers racing on one payment save it once.
 */

type Doc = Record<string, unknown> & { id: number };
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
type Req = { release?: () => void };

const m = vi.hoisted(() => {
  const state = {
    db: {} as Record<string, Doc[]>,
    nextId: 1,
    payment: {} as Payment,
    rzpOrder: { id: "", notes: {} as Record<string, string> },
  };

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
      async ({
        collection,
        where,
      }: {
        collection: string;
        where?: unknown;
      }) => {
        const docs = (state.db[collection] ?? []).filter((d) =>
          matches(d, where),
        );
        return { docs, totalDocs: docs.length };
      },
    ),
    findByID: vi.fn(
      async ({ collection, id }: { collection: string; id: number }) => {
        const doc = (state.db[collection] ?? []).find((d) => d.id === id);
        if (!doc) throw new Error("Not Found");
        return doc;
      },
    ),
    count: vi.fn(
      async ({
        collection,
        where,
      }: {
        collection: string;
        where?: unknown;
      }) => ({
        totalDocs: (state.db[collection] ?? []).filter((d) => matches(d, where))
          .length,
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
        // Like the unique index on orders.razorpay_order_id.
        if (
          collection === "orders" &&
          state.db.orders!.some(
            (o) => o.razorpayOrderId === data.razorpayOrderId,
          )
        ) {
          throw new Error("duplicate key value violates unique constraint");
        }
        const doc: Doc = { ...data, id: state.nextId++ };
        if (collection === "orders") doc.displayId = 1000 + doc.id;
        (state.db[collection] ??= []).push(doc);
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
        const doc = state.db[collection]!.find((d) => d.id === id)!;
        Object.assign(doc, data);
        return doc;
      },
    ),
  };

  // Advisory locks: a second caller waits until the holder's transaction
  // ends, like pg_advisory_xact_lock.
  const held = new Map<string, Promise<void>>();
  const lockKey = vi.fn(async (req: Req, key: string) => {
    while (held.has(key)) await held.get(key);
    let release!: () => void;
    held.set(key, new Promise<void>((resolve) => (release = resolve)));
    req.release = () => {
      held.delete(key);
      release();
    };
  });
  const endTransaction = async (req: Req) => req.release?.();

  const razorpay = {
    payments: {
      fetch: vi.fn(async () => ({ ...state.payment })),
      capture: vi.fn(async () => {
        state.payment.status = "captured";
      }),
    },
    orders: { fetch: vi.fn(async () => state.rzpOrder) },
  };

  return {
    state,
    payload,
    lockKey,
    razorpay,
    takeStock: vi.fn(async (): Promise<string[]> => []),
    commitTransaction: vi.fn(endTransaction),
    killTransaction: vi.fn(endTransaction),
    getProductBySlug: vi.fn(async (slug: string) => ({
      slug,
      name: "2JZ Tee",
      image: "/red.png",
      colors: [
        { name: "Red", swatch: "#f00", image: "/red.png" },
        { name: "Blue", swatch: "#00f", image: "/blue.png" },
      ],
    })),
  };
});

vi.mock("server-only", () => ({}));
vi.mock("payload", () => ({
  createLocalReq: async () => ({}),
  initTransaction: async () => true,
  commitTransaction: m.commitTransaction,
  killTransaction: m.killTransaction,
}));
vi.mock("@/features/account/customer", () => ({
  getPayloadClient: async () => m.payload,
}));
vi.mock("@/features/catalog/repository", () => ({
  getProductBySlug: m.getProductBySlug,
}));
vi.mock("@/features/stock/repository", () => ({ takeStock: m.takeStock }));
vi.mock("@/payload/transaction", () => ({ lockKey: m.lockKey }));
vi.mock("./razorpay", () => ({ razorpayClient: () => m.razorpay }));

const { recordRazorpayPayment } = await import("./repository");

/** A second copy of the module, like the same code on another server. */
async function anotherServer() {
  vi.resetModules();
  return (await import("./repository")).recordRazorpayPayment;
}

const { state, payload, razorpay, takeStock } = m;
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
  // Reset, not just clear: drops queued mock*Once values and restores each
  // fake's own implementation.
  vi.resetAllMocks();
  state.db = { orders: [], transactions: [], customers: [], addresses: [] };
  state.nextId = 1;
  state.payment = {
    id: "pay_1",
    order_id: "order_1",
    status: "captured",
    amount: 199900,
    currency: "INR",
    email: "asha@example.com",
    contact: "+919876543210",
    method: "upi",
  };
  state.rzpOrder = {
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
    const [order] = state.db.orders!;
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
    expect(state.db.transactions).toHaveLength(1);
    expect(state.db.transactions![0]).toMatchObject({
      status: "succeeded",
      order: order!.id,
      amount: 199900,
    });
    // A guest is matched or added by email, so the order shows in their
    // account if they sign up later.
    expect(state.db.customers).toEqual([
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
    expect(m.commitTransaction).toHaveBeenCalledTimes(1);
  });

  it("keeps the photo of the colour bought", async () => {
    await recordRazorpayPayment(config, "order_1", "pay_1");
    expect(state.db.orders![0]!.lineItems).toEqual([
      expect.objectContaining({ image: "/blue.png" }),
    ]);
  });

  it("puts the order on the signed-in shopper's account", async () => {
    state.db.customers!.push({
      id: 50,
      email: "member@example.com",
      firstName: "M",
    });
    state.nextId = 51;
    state.rzpOrder.notes.customer = "50";

    await recordRazorpayPayment(config, "order_1", "pay_1");

    expect(state.db.orders![0]).toMatchObject({
      customer: 50,
      customerEmail: "member@example.com",
    });
    expect(state.db.customers).toHaveLength(1);
  });

  it("saves the delivery address to the shopper's address book once", async () => {
    await recordRazorpayPayment(config, "order_1", "pay_1");
    state.payment = { ...state.payment, id: "pay_2", order_id: "order_2" };
    state.rzpOrder = { ...state.rzpOrder, id: "order_2" };
    await recordRazorpayPayment(config, "order_2", "pay_2");

    expect(state.db.orders).toHaveLength(2);
    expect(state.db.addresses).toHaveLength(1);
    expect(state.db.addresses![0]).toMatchObject({
      addressLine1: "12 MG Road",
    });
  });

  it("uses the email typed at checkout when Razorpay has a placeholder", async () => {
    state.payment.email = "void@razorpay.com";
    state.rzpOrder.notes.email = "typed@example.com";

    await recordRazorpayPayment(config, "order_1", "pay_1");

    expect(state.db.orders![0]!.customerEmail).toBe("typed@example.com");
  });

  it("answers a repeat without asking Razorpay or saving again", async () => {
    await recordRazorpayPayment(config, "order_1", "pay_1");
    razorpay.payments.fetch.mockClear();

    const again = await recordRazorpayPayment(config, "order_1", "pay_1");

    expect(again.status).toBe("duplicate");
    expect(razorpay.payments.fetch).not.toHaveBeenCalled();
    expect(state.db.orders).toHaveLength(1);
    expect(takeStock).toHaveBeenCalledTimes(1);
  });

  it("shares one save between callers on the same server", async () => {
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
    expect(state.db.orders).toHaveLength(1);
    expect(takeStock).toHaveBeenCalledTimes(1);
    // One save, so Razorpay is asked once and no database connection waits.
    expect(razorpay.payments.fetch).toHaveBeenCalledTimes(1);
  });

  it("saves once when callers on different servers race past the first check", async () => {
    const otherServer = await anotherServer();

    const results = await Promise.all([
      recordRazorpayPayment(config, "order_1", "pay_1"),
      otherServer(config, "order_1", "pay_1"),
    ]);

    expect(results.map((r) => r.status).sort()).toEqual([
      "duplicate",
      "recorded",
    ]);
    // Both got past the check before the lock; the one that waited found
    // the order inside its transaction and took no stock.
    expect(razorpay.payments.fetch).toHaveBeenCalledTimes(2);
    expect(takeStock).toHaveBeenCalledTimes(1);
    expect(state.db.orders).toHaveLength(1);
    expect(state.db.transactions).toHaveLength(1);
    expect(m.killTransaction).toHaveBeenCalledTimes(1);
  });

  it("falls back to the unique index if the order appears after the re-check", async () => {
    state.db.orders!.push({
      id: 77,
      displayId: 1077,
      razorpayOrderId: "order_1",
    });
    state.nextId = 78;
    // Neither the first check nor the one inside the transaction sees it.
    const empty = { docs: [], totalDocs: 0 };
    payload.find
      .mockResolvedValueOnce(empty)
      .mockResolvedValueOnce(empty)
      .mockResolvedValueOnce(empty);

    const result = await recordRazorpayPayment(config, "order_1", "pay_1");

    expect(result).toEqual({
      status: "duplicate",
      orderId: 77,
      orderNumber: "SB-1077",
    });
    expect(m.killTransaction).toHaveBeenCalledTimes(1);
    expect(m.commitTransaction).not.toHaveBeenCalled();
    expect(state.db.orders).toHaveLength(1);
  });

  it("refuses a payment made for a different order", async () => {
    state.payment.order_id = "order_other";
    const result = await recordRazorpayPayment(config, "order_1", "pay_1");
    expect(result).toEqual({
      status: "rejected",
      reason: "Payment is for another order",
    });
    expect(state.db.orders).toHaveLength(0);
  });

  it.each(["failed", "created", "refunded"])(
    "refuses a payment that is %s",
    async (status) => {
      state.payment.status = status;
      const result = await recordRazorpayPayment(config, "order_1", "pay_1");
      expect(result).toEqual({
        status: "rejected",
        reason: `Payment is ${status}`,
      });
      expect(state.db.orders).toHaveLength(0);
    },
  );

  it("refuses a currency the store doesn't support", async () => {
    state.payment.currency = "JPY";
    const result = await recordRazorpayPayment(config, "order_1", "pay_1");
    expect(result.status).toBe("rejected");
  });

  it("refuses a Razorpay order that isn't from this shop's checkout", async () => {
    state.rzpOrder.notes = { email: "x@example.com" };
    const result = await recordRazorpayPayment(config, "order_1", "pay_1");
    expect(result).toEqual({
      status: "rejected",
      reason: "Order has no cart snapshot",
    });
  });

  it("captures an authorized payment before saving anything", async () => {
    state.payment.status = "authorized";
    await recordRazorpayPayment(config, "order_1", "pay_1");

    expect(razorpay.payments.capture).toHaveBeenCalledWith(
      "pay_1",
      199900,
      "INR",
    );
    const captured = razorpay.payments.capture.mock.invocationCallOrder[0]!;
    const firstWrite = payload.create.mock.invocationCallOrder[0]!;
    expect(captured).toBeLessThan(firstWrite);
    expect(state.db.orders).toHaveLength(1);
  });

  it("carries on when another caller captured the payment first", async () => {
    state.payment.status = "authorized";
    razorpay.payments.capture.mockRejectedValueOnce(
      new Error("already captured"),
    );
    razorpay.payments.fetch
      .mockResolvedValueOnce({ ...state.payment })
      .mockResolvedValueOnce({ ...state.payment, status: "captured" });

    const result = await recordRazorpayPayment(config, "order_1", "pay_1");

    expect(result.status).toBe("recorded");
  });

  it("saves nothing if the payment can't be captured, so it's retried", async () => {
    state.payment.status = "authorized";
    razorpay.payments.capture.mockRejectedValueOnce(new Error("gateway down"));

    await expect(
      recordRazorpayPayment(config, "order_1", "pay_1"),
    ).rejects.toThrow("gateway down");
    expect(state.db.orders).toHaveLength(0);
    expect(payload.create).not.toHaveBeenCalled();
  });

  it("records an order that sold out while paying and flags it for a refund", async () => {
    takeStock.mockResolvedValueOnce([
      "2JZ Tee (Blue, M): 1 sold, 0 were available",
    ]);

    const result = await recordRazorpayPayment(config, "order_1", "pay_1");

    expect(result.status).toBe("recorded");
    expect(state.db.orders![0]!.metadata).toMatchObject({
      oversold: ["2JZ Tee (Blue, M): 1 sold, 0 were available"],
    });
  });

  it("rolls back, without committing, when saving the order fails", async () => {
    // The guest already has a customer record, so the first write is the
    // order itself, inside the transaction.
    state.db.customers!.push({ id: 99, email: "asha@example.com" });
    state.nextId = 100;
    payload.create.mockRejectedValueOnce(new Error("database down"));

    await expect(
      recordRazorpayPayment(config, "order_1", "pay_1"),
    ).rejects.toThrow("database down");

    expect(payload.create).toHaveBeenCalledWith(
      expect.objectContaining({ collection: "orders" }),
    );
    expect(takeStock).toHaveBeenCalledTimes(1);
    expect(m.killTransaction).toHaveBeenCalledTimes(1);
    expect(m.commitTransaction).not.toHaveBeenCalled();
    expect(state.db.transactions).toHaveLength(0);
  });
});
