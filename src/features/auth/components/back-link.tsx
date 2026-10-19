import Link from "next/link";
import { focusRing } from "./styles";

/** Blue "Back" link under the account forms. */
export function BackLink() {
  return (
    <Link
      href="/account"
      className={`mx-auto mt-5 block w-fit text-body-1 text-primary hover:underline ${focusRing}`}
    >
      Back
    </Link>
  );
}
