import type { Access, CollectionConfig, Config } from "payload";
import { describe, expect, it } from "vitest";
import { staffTotp } from "./staff-totp";

const publicRead: Access = () => true;
const staffOnly: Access = ({ req }) => req.user?.collection === "users";

const config = {
  collections: [
    { slug: "users", auth: true, fields: [] },
    { slug: "media", access: { read: publicRead }, fields: [] },
    { slug: "orders", access: { read: staffOnly }, fields: [] },
    { slug: "notes", fields: [] },
  ] as CollectionConfig[],
} as unknown as Config;

const built = await staffTotp("Test")(config);
const access = (slug: string, op: "read" | "update") => {
  const fn = built.collections!.find((c) => c.slug === slug)!.access![op]!;
  return (user: Record<string, unknown> | null) =>
    fn({
      req: {
        user,
        payload: { config: built },
      },
    } as never);
};

const staff = (extra: Record<string, unknown>) => ({
  id: 1,
  collection: "users",
  ...extra,
});

describe("staffTotp", () => {
  it("leaves anonymous access as it was", async () => {
    expect(await access("media", "read")(null)).toBe(true);
    expect(await access("orders", "read")(null)).toBe(false);
    expect(await access("notes", "update")(null)).toBe(false);
  });

  it("refuses staff who haven't entered their code", async () => {
    const owesCode = staff({ hasTotp: true, _strategy: "local-jwt" });
    expect(await access("orders", "read")(owesCode)).toBe(false);
    expect(await access("media", "read")(owesCode)).toBe(false);
  });

  it("refuses staff who haven't set up an authenticator", async () => {
    const notSetUp = staff({ hasTotp: false, _strategy: "local-jwt" });
    expect(await access("orders", "read")(notSetUp)).toBe(false);
  });

  it("lets staff in once they've entered their code", async () => {
    const verified = staff({ hasTotp: true, _strategy: "totp" });
    expect(await access("orders", "read")(verified)).toBe(true);
    expect(await access("notes", "update")(verified)).toBe(true);
  });
});
