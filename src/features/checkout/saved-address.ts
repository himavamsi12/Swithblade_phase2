/* The delivery address remembered in this browser between checkouts. */
export const ADDRESS_KEY = "sb:delivery-address";

/** Forget the remembered address, e.g. on sign-out on a shared device. */
export function clearSavedAddress() {
  try {
    localStorage.removeItem(ADDRESS_KEY);
  } catch {
    // Storage blocked: nothing saved.
  }
}
