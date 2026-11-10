import { beforeEach, describe, expect, it, vi } from "vitest";

/*
 * Account edits. The important property: a shopper can only ever change
 * their own records, whatever ids or fields a tampered form sends.
 */

type Address = { id: number; customer: number } & Record<string, unknown>;
let addresses: Address[];
let customers: Record<number, Record<string, unknown>>;

const owned = (where: { and: { [k: string]: { equals: unknown } }[] }) =>
  addresses.filter((a) =>
    where.and.every((c) => {
      const [field, { equals }] = Object.entries(c)[0]!;
      return a[field] === equals;
    }),
  );

const payload = {
  update: vi.fn(
    async (args: {
      collection: string;
      id?: number;
      where?: { and: { [k: string]: { equals: unknown } }[] };
      data: Record<string, unknown>;
    }) => {
      if (args.collection === "customers") {
        Object.assign(customers[args.id!]!, args.data);
        return customers[args.id!];
      }
      const docs = owned(args.where!);
      docs.forEach((d) => Object.assign(d, args.data));
      return { docs };
    },
  ),
  create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
    const doc = { ...data, id: addresses.length + 100 } as Address;
    addresses.push(doc);
    return doc;
  }),
  delete: vi.fn(
    async ({
      where,
    }: {
      where: { and: { [k: string]: { equals: unknown } }[] };
    }) => {
      const docs = owned(where);
      addresses = addresses.filter((a) => !docs.includes(a));
      return { docs };
    },
  ),
};

let session: { customer: { id: number; phone?: string | null } } | null;
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({
  clientIp: async () => "203.0.113.5",
  rateLimit: async () => true,
}));
vi.mock("@/lib/supabase", () => ({ isAuthProviderEnabled: async () => true }));
type AuthResult = { error: { code: string; message?: string } | null };
const auth = {
  updateUser: vi.fn(async (): Promise<AuthResult> => ({ error: null })),
  verifyOtp: vi.fn(async (): Promise<AuthResult> => ({ error: null })),
};
vi.mock("@/lib/supabase-server", () => ({
  createSupabaseServerClient: async () => ({ auth }),
}));
vi.mock("./customer", () => ({
  getPayloadClient: async () => payload,
  getSignedInCustomer: async () => session,
}));

const {
  updateProfile,
  saveAddress,
  deleteAddress,
  sendPhoneCode,
  verifyPhoneCode,
} = await import("./actions");

const idle = { status: "idle" as const };
const form = (fields: Record<string, string>) => {
  const data = new FormData();
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
};
const address = {
  fullName: "Asha Rao",
  phone: "+91 98765 43210",
  addressLine1: "12 MG Road",
  city: "Bengaluru",
  state: "Karnataka",
  postalCode: "560001",
  country: "IN",
};

beforeEach(() => {
  vi.resetAllMocks();
  session = { customer: { id: 1 } };
  customers = {
    1: { email: "asha@example.com", firstName: "Asha" },
    2: { email: "ravi@example.com", firstName: "Ravi" },
  };
  addresses = [
    { id: 10, customer: 1, addressLine1: "Old street" },
    { id: 20, customer: 2, addressLine1: "Ravi's street" },
  ];
});

describe("updateProfile", () => {
  it("saves name and phone on the signed-in shopper only", async () => {
    const state = await updateProfile(
      idle,
      form({
        firstName: " Asha ",
        lastName: "Rao",
        phoneCountry: "IN",
        phone: "98765 43210",
      }),
    );
    expect(state).toEqual({ status: "success", message: "Profile saved." });
    expect(customers[1]).toMatchObject({ firstName: "Asha", lastName: "Rao" });
    expect(customers[2]!.firstName).toBe("Ravi");
  });

  it("ignores fields a tampered form adds, like the email", async () => {
    await updateProfile(
      idle,
      form({ firstName: "Asha", email: "attacker@example.com" }),
    );
    expect(customers[1]!.email).toBe("asha@example.com");
  });

  it("requires a first name and a sensible phone", async () => {
    const state = await updateProfile(
      idle,
      form({ firstName: "", phone: "call me" }),
    );
    expect(state.fieldErrors).toEqual({
      firstName: "Enter your first name.",
      phone: "Enter a valid phone number.",
    });
    expect(payload.update).not.toHaveBeenCalled();
  });

  it("asks to sign in again once the session has ended", async () => {
    session = null;
    const state = await updateProfile(idle, form({ firstName: "Asha" }));
    expect(state.message).toBe("Your session has ended. Please sign in again.");
  });

  it("reports a failed save instead of throwing", async () => {
    payload.update.mockRejectedValueOnce(new Error("db down"));
    const state = await updateProfile(idle, form({ firstName: "Asha" }));
    expect(state).toEqual({
      status: "error",
      message: "Couldn't save. Please try again.",
    });
  });
});

describe("saveAddress", () => {
  it("adds an address to the signed-in shopper's book", async () => {
    const state = await saveAddress(idle, form(address));
    expect(state).toEqual({ status: "success", message: "Address added." });
    expect(addresses.at(-1)).toMatchObject({
      customer: 1,
      firstName: "Asha",
      lastName: "Rao",
      title: "Home",
    });
  });

  it("saves the typed name of an Other address", async () => {
    await saveAddress(
      idle,
      form({ ...address, title: "Other", customTitle: " Mom's place " }),
    );
    expect(addresses.at(-1)!.title).toBe("Mom's place");
  });

  it("keeps Other when no name is typed", async () => {
    await saveAddress(idle, form({ ...address, title: "Other" }));
    expect(addresses.at(-1)!.title).toBe("Other");
  });

  it("can't add an address to someone else's account", async () => {
    await saveAddress(idle, form({ ...address, customer: "2" }));
    expect(addresses.at(-1)!.customer).toBe(1);
  });

  it("edits the shopper's own address", async () => {
    const state = await saveAddress(idle, form({ ...address, id: "10" }));
    expect(state.message).toBe("Address updated.");
    expect(addresses.find((a) => a.id === 10)!.addressLine1).toBe("12 MG Road");
  });

  it("can't edit another shopper's address by sending its id", async () => {
    const state = await saveAddress(idle, form({ ...address, id: "20" }));
    expect(state.status).toBe("error");
    expect(addresses.find((a) => a.id === 20)!.addressLine1).toBe(
      "Ravi's street",
    );
  });

  it("checks the required fields", async () => {
    const state = await saveAddress(
      idle,
      form({ ...address, addressLine1: "", country: "XX" }),
    );
    expect(state.fieldErrors).toMatchObject({
      addressLine1: "Enter the address.",
      country: "Choose a country.",
    });
  });
});

describe("deleteAddress", () => {
  it("deletes the shopper's own address", async () => {
    expect(await deleteAddress(10)).toEqual({ status: "success" });
    expect(addresses.map((a) => a.id)).toEqual([20]);
  });

  it("can't delete another shopper's address", async () => {
    const state = await deleteAddress(20);
    expect(state.status).toBe("error");
    expect(addresses.map((a) => a.id)).toEqual([10, 20]);
  });

  it("reports a failed delete instead of throwing", async () => {
    payload.delete.mockRejectedValueOnce(new Error("db down"));
    expect((await deleteAddress(10)).status).toBe("error");
  });
});

describe("phone verification", () => {
  beforeEach(() => {
    session = { customer: { id: 1, phone: "+91 9876543210" } };
  });

  it("texts a code to the profile's own number", async () => {
    const state = await sendPhoneCode();
    expect(state.status).toBe("success");
    expect(auth.updateUser).toHaveBeenCalledWith({ phone: "+919876543210" });
  });

  it("says when the number belongs to another account", async () => {
    auth.updateUser.mockResolvedValueOnce({ error: { code: "phone_exists" } });
    const state = await sendPhoneCode();
    expect(state.message).toBe(
      "This number is already used by another account.",
    );
  });

  it("checks the code against the profile's number", async () => {
    const state = await verifyPhoneCode(idle, form({ otp: "123456" }));
    expect(state).toEqual({
      status: "success",
      message: "Phone number verified.",
    });
    expect(auth.verifyOtp).toHaveBeenCalledWith({
      phone: "+919876543210",
      token: "123456",
      type: "phone_change",
    });
  });

  it("asks for a 6-digit code", async () => {
    const state = await verifyPhoneCode(idle, form({ otp: "12" }));
    expect(state.fieldErrors?.otp).toBe("Enter the 6-digit code.");
  });
});
