import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CartItemInput, CartLine } from "./types";

/** The bag saved on the account, as the server sees it. */
let account: { customerId: number; lines: CartLine[] } | null;

vi.mock("./actions", () => ({
  loadSavedBag: vi.fn(async () =>
    account ? { ...account, lines: [...account.lines] } : null,
  ),
  saveBag: vi.fn(async (lines: CartLine[]) => {
    if (!account) return false;
    account.lines = lines;
    return true;
  }),
}));

const item = (productId: string): CartItemInput => ({
  productId,
  slug: productId,
  name: productId,
  image: null,
  price: 100000,
  currency: "INR",
  color: null,
  size: "M",
});

const line = (productId: string, quantity = 1): CartLine => ({
  ...item(productId),
  quantity,
});

const ids = (lines: CartLine[]) =>
  lines.map((l) => `${l.productId}×${l.quantity}`).sort();

async function loadStore() {
  vi.resetModules();
  return import("./store");
}

/** Lets the debounced save run to completion. */
async function flushSave() {
  await vi.advanceTimersByTimeAsync(1_000);
}

describe("signed-in bag sync", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    account = { customerId: 1, lines: [] };
  });

  it("keeps items another device added since this one last synced", async () => {
    const { syncBag, cartActions } = await loadStore();
    await syncBag();

    // Another device adds a shirt; this one hasn't re-synced yet.
    account!.lines = [line("shirt")];
    cartActions.add(item("hoodie"));
    await flushSave();

    expect(ids(account!.lines)).toEqual(["hoodie×1", "shirt×1"]);
  });

  it("shows this device the merged bag after saving", async () => {
    const { syncBag, cartActions } = await loadStore();
    await syncBag();

    account!.lines = [line("shirt")];
    cartActions.add(item("hoodie"));
    await flushSave();

    const stored = JSON.parse(localStorage.getItem("switchblade.bag.v1")!);
    expect(ids(stored)).toEqual(["hoodie×1", "shirt×1"]);
  });

  it("removes only the item removed here", async () => {
    account!.lines = [line("shirt"), line("hoodie")];
    const { syncBag, cartActions, lineKey } = await loadStore();
    await syncBag();

    account!.lines = [...account!.lines, line("cap")];
    cartActions.remove(lineKey(line("hoodie")));
    await flushSave();

    expect(ids(account!.lines)).toEqual(["cap×1", "shirt×1"]);
  });

  it("applies several quick edits in order", async () => {
    const { syncBag, cartActions, lineKey } = await loadStore();
    await syncBag();

    cartActions.add(item("shirt"));
    cartActions.setQuantity(lineKey(line("shirt")), 3);
    cartActions.add(item("cap"));
    await flushSave();

    expect(ids(account!.lines)).toEqual(["cap×1", "shirt×3"]);
  });

  it("keeps an edit made while the account is being read", async () => {
    const { syncBag, cartActions } = await loadStore();
    await syncBag();
    const { loadSavedBag } = await import("./actions");
    let release!: () => void;
    vi.mocked(loadSavedBag).mockImplementationOnce(async () => {
      await new Promise<void>((resolve) => (release = resolve));
      return { customerId: 1, lines: [line("shirt")] };
    });

    cartActions.add(item("hoodie"));
    await vi.advanceTimersByTimeAsync(600); // The save is now reading.
    cartActions.add(item("cap"));
    release();
    await flushSave();

    expect(ids(account!.lines)).toEqual(["cap×1", "hoodie×1", "shirt×1"]);
    const stored = JSON.parse(localStorage.getItem("switchblade.bag.v1")!);
    expect(ids(stored)).toEqual(["cap×1", "hoodie×1", "shirt×1"]);
  });

  it("still saves this device's bag when the account can't be read", async () => {
    const { syncBag, cartActions } = await loadStore();
    await syncBag();
    const { loadSavedBag } = await import("./actions");
    vi.mocked(loadSavedBag).mockRejectedValueOnce(new Error("offline"));

    cartActions.add(item("shirt"));
    await flushSave();

    expect(ids(account!.lines)).toEqual(["shirt×1"]);
  });

  it("merges a guest bag into the account at sign-in", async () => {
    account = null;
    const { syncBag, cartActions } = await loadStore();
    await syncBag();
    cartActions.add(item("cap"));

    account = { customerId: 1, lines: [line("shirt")] };
    await syncBag();
    await flushSave();

    expect(ids(account.lines)).toEqual(["cap×1", "shirt×1"]);
  });

  it("never saves a guest's bag to an account", async () => {
    account = null;
    const { syncBag, cartActions } = await loadStore();
    await syncBag();
    const { saveBag } = await import("./actions");

    cartActions.add(item("cap"));
    await flushSave();

    expect(saveBag).not.toHaveBeenCalled();
  });
});
