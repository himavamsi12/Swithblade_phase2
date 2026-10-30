import type { Access, Config, Plugin } from "payload";
import { payloadTotp } from "payload-totp";

/*
 * Authenticator-app codes (TOTP) for staff signing in to the admin.
 *
 * payload-totp makes every staff member set up an authenticator after their
 * first sign-in, then asks for a code at each sign-in. Until the code is
 * entered, its access wrapper refuses that session everything.
 *
 * The wrapper also refuses requests with no user at all, which would break
 * what is public through Payload's API: product photos at /api/media/file,
 * published products and categories. So anonymous requests get the access
 * they had before; only signed-in sessions go through the TOTP check.
 *
 * Must be the last plugin, so it sees every collection.
 */

type AccessMap = Partial<Record<string, Access>>;

/** Anonymous requests use the original access; signed-in ones the wrapped. */
function keepAnonymousAccess(original: AccessMap, wrapped: AccessMap) {
  for (const op of Object.keys(wrapped)) {
    const totp = wrapped[op];
    const before = original[op];
    if (!totp || totp === before) continue;
    // Payload's default access, with no function set, is "signed in".
    wrapped[op] = (args) =>
      args.req.user ? totp(args) : before ? before(args) : false;
  }
}

export const staffTotp =
  (issuer: string): Plugin =>
  async (incoming: Config) => {
    const original = new Map<string, AccessMap>();
    for (const c of incoming.collections ?? [])
      original.set(`collection:${c.slug}`, { ...c.access });
    for (const g of incoming.globals ?? [])
      original.set(`global:${g.slug}`, { ...g.access });

    const config = await payloadTotp({
      collection: "users",
      forceSetup: true,
      totp: { issuer },
    })(incoming);

    for (const c of config.collections ?? []) {
      const before = original.get(`collection:${c.slug}`);
      if (before && c.access)
        keepAnonymousAccess(before, c.access as AccessMap);
    }
    for (const g of config.globals ?? []) {
      const before = original.get(`global:${g.slug}`);
      if (before && g.access)
        keepAnonymousAccess(before, g.access as AccessMap);
    }
    return config;
  };
