import { vi } from "vitest";

/*
 * One order in memory behind a Payload-shaped client, for tests of the
 * order follow-ups (Shiprocket, emails) that read an order and write its
 * metadata. Reads return copies, like a real database, so a test can
 * change the stored order between a read and a write.
 *
 * Use from a vi.mock factory with a dynamic import, so the mocked module
 * and the test share this instance:
 *
 *   vi.mock("@/features/account/customer", async () => {
 *     const { fakeOrders } = await import("@/test/fake-orders");
 *     return { getPayloadClient: async () => fakeOrders.payload };
 *   });
 */

export type FakeOrder = { id: number } & Record<string, unknown> & {
    metadata?: Record<string, unknown> | null;
  };

function createFakeOrders() {
  let order: FakeOrder = { id: 1, metadata: {} };
  const payload = {
    findByID: vi.fn(async () => structuredClone(order)),
    update: vi.fn(async ({ data }: { data: Partial<FakeOrder> }) => {
      order = { ...order, ...structuredClone(data) };
      return structuredClone(order);
    }),
  };
  return {
    payload,
    /** The stored order, as it stands now. */
    get order() {
      return order;
    },
    set(next: FakeOrder) {
      order = structuredClone(next);
    },
  };
}

export const fakeOrders = createFakeOrders();
