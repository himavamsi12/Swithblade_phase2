"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getPayloadClient, getSignedInCustomer } from "./customer";
import { composePhone, DEFAULT_PHONE_COUNTRY } from "./phone";
import {
  addressSchema,
  profileSchema,
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
  revalidatePath("/account");
  return { status: "success" };
}
