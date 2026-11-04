"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createCustomerReturn,
  getPayloadClient,
  getSignedInCustomer,
} from "./customer";
import { composePhone, DEFAULT_PHONE_COUNTRY } from "./phone";
import {
  addressSchema,
  profileSchema,
  MAX_RETURN_PHOTOS,
  MIN_RETURN_PHOTOS,
  PHOTO_CAPTION_MAX,
  returnRequestSchema,
  splitName,
  type FormState,
} from "./schema";

const SIGNED_OUT: FormState = {
  status: "error",
  message: "Your session has ended. Please sign in again.",
};
const FAILED: FormState = {
  status: "error",
  message: "Couldn't save. Please try again.",
};

const errorsOf = (error: z.ZodError) =>
  Object.fromEntries(
    Object.entries(z.flattenError(error).fieldErrors).map(([k, v]) => [
      k,
      (v as string[] | undefined)?.[0],
    ]),
  );

export async function updateProfile(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await getSignedInCustomer();
  if (!session) return SIGNED_OUT;

  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", fieldErrors: errorsOf(parsed.error) };
  }
  const { firstName, lastName, phoneCountry, phone } = parsed.data;

  try {
    const payload = await getPayloadClient();
    await payload.update({
      collection: "customers",
      id: session.customer.id,
      data: {
        firstName,
        lastName,
        phone: phone
          ? composePhone(phoneCountry ?? DEFAULT_PHONE_COUNTRY, phone)
          : null,
      },
      depth: 0,
    });
  } catch {
    return FAILED;
  }
  revalidatePath("/account");
  return { status: "success", message: "Profile saved." };
}

/** Adds a new address, or updates one the shopper owns when `id` is sent. */
export async function saveAddress(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await getSignedInCustomer();
  if (!session) return SIGNED_OUT;

  const parsed = addressSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", fieldErrors: errorsOf(parsed.error) };
  }
  const { id, fullName, country, ...rest } = parsed.data;
  const data = {
    ...rest,
    ...splitName(fullName),
    country: country as never,
    customer: session.customer.id,
  };

  try {
    const payload = await getPayloadClient();
    if (id) {
      // Only update if this address belongs to the signed-in customer.
      const { docs } = await payload.update({
        collection: "addresses",
        where: {
          and: [
            { id: { equals: id } },
            { customer: { equals: session.customer.id } },
          ],
        },
        data,
        depth: 0,
      });
      if (docs.length === 0) return FAILED;
    } else {
      await payload.create({ collection: "addresses", data, depth: 0 });
    }
  } catch {
    return FAILED;
  }
  revalidatePath("/account");
  return {
    status: "success",
    message: id ? "Address updated." : "Address added.",
  };
}

export async function deleteAddress(addressId: number): Promise<FormState> {
  const session = await getSignedInCustomer();
  if (!session) return SIGNED_OUT;

  try {
    const payload = await getPayloadClient();
    // Only delete if this address belongs to the signed-in customer.
    const { docs } = await payload.delete({
      collection: "addresses",
      where: {
        and: [
          { id: { equals: addressId } },
          { customer: { equals: session.customer.id } },
        ],
      },
      depth: 0,
    });
    if (docs.length === 0) return FAILED;
  } catch {
    return FAILED;
  }
  revalidatePath("/account");
  return { status: "success" };
}

const RETURN_MESSAGES = {
  "not-returnable": "This order can no longer be returned.",
  "already-returned": "Some of these items are already in a return.",
  "needs-details": "Please tell us more about the reason for your return.",
  invalid: "Please check the items and try again.",
} as const;

/** Photos are resized in the browser first; this is a backstop. */
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
/** Under the platform's request limit, with room for the other fields. */
const MAX_PHOTOS_TOTAL_BYTES = 3.5 * 1024 * 1024;

/** The image type a file's first bytes show, whatever it claims to be. */
function sniffImage(bytes: Uint8Array): string | null {
  const ascii = (from: number, to: number) =>
    String.fromCharCode(...bytes.subarray(from, to));
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (ascii(1, 4) === "PNG") return "image/png";
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  return null;
}

const EXTENSION: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/**
 * Requests a return for one of the shopper's orders, for staff to review.
 * Items arrive as `qty:<line id>` fields (a line left out isn't returned),
 * photos as `photos` files with a `captions` entry each, in the same order.
 */
export async function requestReturn(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const session = await getSignedInCustomer();
  if (!session) return SIGNED_OUT;

  const lines = [...formData.entries()].flatMap(([name, value]) =>
    name.startsWith("qty:") && Number(value) > 0
      ? [{ key: name.slice(4), quantity: Number(value) }]
      : [],
  );
  const parsed = returnRequestSchema.safeParse({
    orderId: formData.get("orderId"),
    reasonId: formData.get("reasonId") || undefined,
    note: formData.get("note") ?? undefined,
    lines,
  });
  if (!parsed.success) {
    return { status: "error", fieldErrors: errorsOf(parsed.error) };
  }

  const files = formData
    .getAll("photos")
    .filter((f): f is File => f instanceof File && f.size > 0);
  const captions = formData
    .getAll("captions")
    .map((c) => (typeof c === "string" ? c.trim() : ""));
  const total = files.reduce((sum, f) => sum + f.size, 0);
  if (files.length < MIN_RETURN_PHOTOS) {
    return {
      status: "error",
      fieldErrors: {
        photos: `Please add at least ${MIN_RETURN_PHOTOS} pictures (front and back).`,
      },
    };
  }
  if (
    captions.length !== files.length ||
    captions.some((c) => !c || c.length > PHOTO_CAPTION_MAX)
  ) {
    return {
      status: "error",
      fieldErrors: { photos: "Please add a caption to each picture." },
    };
  }
  if (
    files.length > MAX_RETURN_PHOTOS ||
    total > MAX_PHOTOS_TOTAL_BYTES ||
    files.some((f) => f.size > MAX_PHOTO_BYTES)
  ) {
    return {
      status: "error",
      fieldErrors: {
        photos: `Add up to ${MAX_RETURN_PHOTOS} smaller pictures.`,
      },
    };
  }
  const photos = [];
  for (const [i, file] of files.entries()) {
    const data = Buffer.from(await file.arrayBuffer());
    const mimetype = sniffImage(data);
    if (!mimetype) {
      return {
        status: "error",
        fieldErrors: { photos: "Pictures must be JPG, PNG or WEBP." },
      };
    }
    // Our own name, never the shopper's: it becomes the stored file name.
    const name = `return-${session.customer.id}-${Date.now()}-${i + 1}.${EXTENSION[mimetype]}`;
    photos.push({
      file: { data, mimetype, name, size: data.length },
      caption: captions[i]!,
    });
  }

  let result;
  try {
    result = await createCustomerReturn(session.customer.id, {
      ...parsed.data,
      photos,
    });
  } catch (error) {
    console.error("Return request failed", error);
    return {
      status: "error",
      message: "Couldn't request the return. Please try again.",
    };
  }
  if (result.status !== "created") {
    return { status: "error", message: RETURN_MESSAGES[result.status] };
  }
  revalidatePath("/account/orders");
  revalidatePath("/account/returns");
  return { status: "success", message: result.returnNumber };
}
