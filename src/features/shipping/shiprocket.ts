import "server-only";
import { z } from "zod";
import { cacheDelete, cacheGet, cacheSet } from "@/lib/redis";
import type { ShiprocketOrder } from "./shiprocket-order";

/*
 * Shiprocket API client. Uses a dedicated API user (Settings → API), not the
 * account login. Shipping is disabled, not broken, while the keys are unset.
 * Nothing here assigns a courier or books a pickup: those cost money and are
 * done from the Shiprocket panel.
 */
const schema = z.object({
  SHIPROCKET_EMAIL: z.string().min(1).optional(),
  SHIPROCKET_PASSWORD: z.string().min(1).optional(),
  /** Pickup address nickname from Settings → Pickup Addresses. */
  SHIPROCKET_PICKUP_LOCATION: z.string().min(1).optional(),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  throw new Error(
    `Invalid Shiprocket environment variables:\n${z.prettifyError(parsed.error)}`,
  );
}
const {
  SHIPROCKET_EMAIL: email,
  SHIPROCKET_PASSWORD: password,
  SHIPROCKET_PICKUP_LOCATION: pickupLocation,
} = parsed.data;

const BASE = "https://apiv2.shiprocket.in/v1/external";
/** Tokens last 10 days; refresh a day early. */
const TOKEN_TTL_MS = 9 * 24 * 60 * 60 * 1000;
const TIMEOUT_MS = 8_000;

export const shiprocketEnabled = () =>
  Boolean(email && password && pickupLocation);

/** Shared by all instances, so each cold start doesn't log in again. */
const TOKEN_KEY = "shiprocket:token";

let token: { value: string; expiresAt: number } | undefined;

async function getToken(): Promise<string> {
  if (token && token.expiresAt > Date.now()) return token.value;
  const shared = await cacheGet<{ value: string; expiresAt: number }>(
    TOKEN_KEY,
  );
  if (shared && shared.expiresAt > Date.now()) {
    token = shared;
    return token.value;
  }
  const res = await fetch(`${BASE}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const json = (await res.json().catch(() => ({}))) as { token?: string };
  if (!res.ok || !json.token) {
    throw new Error(`Shiprocket login failed (${res.status})`);
  }
  token = { value: json.token, expiresAt: Date.now() + TOKEN_TTL_MS };
  await cacheSet(TOKEN_KEY, token, TOKEN_TTL_MS / 1000);
  return token.value;
}

async function request(path: string, init: RequestInit = {}, retry = true) {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${await getToken()}`,
      ...init.headers,
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  // A token revoked early (e.g. password reset): log in again once.
  if (res.status === 401 && retry) {
    token = undefined;
    await cacheDelete(TOKEN_KEY);
    return request(path, init, false);
  }
  return res;
}

const pickupSchema = z.object({
  data: z.object({
    shipping_address: z.array(
      z.object({
        pickup_location: z.string(),
        pin_code: z.union([z.string(), z.number()]),
      }),
    ),
  }),
});

let pickupPincode: Promise<string> | undefined;

/** The pincode parcels leave from, looked up once per instance. */
function getPickupPincode(): Promise<string> {
  pickupPincode ??= (async () => {
    const res = await request("/settings/company/pickup");
    const json = pickupSchema.parse(await res.json());
    const match = json.data.shipping_address.find(
      (a) => a.pickup_location === pickupLocation,
    );
    if (!match) {
      throw new Error(`Shiprocket pickup "${pickupLocation}" not found`);
    }
    return String(match.pin_code);
  })().catch((error: unknown) => {
    pickupPincode = undefined;
    throw error;
  });
  return pickupPincode;
}

const serviceable = new Map<string, { value: boolean; expiresAt: number }>();
const SERVICEABLE_TTL_MS = 60 * 60 * 1000;

/** Whether any courier delivers a prepaid parcel to this Indian pincode. */
export async function isServiceable(
  pincode: string,
  weightKg: number,
): Promise<boolean> {
  const key = `${pincode}:${weightKg}`;
  const cached = serviceable.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value;
  const shared = await cacheGet<boolean>(`shiprocket:serviceable:${key}`);
  if (shared !== null) {
    serviceable.set(key, {
      value: shared,
      expiresAt: Date.now() + SERVICEABLE_TTL_MS,
    });
    return shared;
  }

  const query = new URLSearchParams({
    pickup_postcode: await getPickupPincode(),
    delivery_postcode: pincode,
    weight: String(weightKg),
    cod: "0",
  });
  const res = await request(`/courier/serviceability/?${query}`);
  // An outage isn't an answer: throw rather than cache "not serviceable".
  if (res.status >= 500 || res.status === 429) {
    throw new Error(`Shiprocket serviceability failed (${res.status})`);
  }
  const json = (await res.json().catch(() => ({}))) as {
    data?: { available_courier_companies?: unknown[] };
  };
  const value = (json.data?.available_courier_companies?.length ?? 0) > 0;
  serviceable.set(key, { value, expiresAt: Date.now() + SERVICEABLE_TTL_MS });
  await cacheSet(
    `shiprocket:serviceable:${key}`,
    value,
    SERVICEABLE_TTL_MS / 1000,
  );
  return value;
}

const createdSchema = z.object({
  order_id: z.union([z.string(), z.number()]),
  shipment_id: z.union([z.string(), z.number()]).nullish(),
});

/** Creates the order in Shiprocket's panel, ready for a courier. */
export async function createOrder(
  order: Omit<ShiprocketOrder, "pickup_location">,
): Promise<{ orderId: string; shipmentId: string | null }> {
  const res = await request("/orders/create/adhoc", {
    method: "POST",
    body: JSON.stringify({ ...order, pickup_location: pickupLocation }),
  });
  const json: unknown = await res.json().catch(() => null);
  const created = createdSchema.safeParse(json);
  if (!res.ok || !created.success) {
    throw new Error(
      `Shiprocket order create failed (${res.status}): ${JSON.stringify(json)}`,
    );
  }
  return {
    orderId: String(created.data.order_id),
    shipmentId:
      created.data.shipment_id != null
        ? String(created.data.shipment_id)
        : null,
  };
}
