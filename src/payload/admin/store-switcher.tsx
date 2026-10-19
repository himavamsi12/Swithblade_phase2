import type { ServerProps } from "payload";

/** Store name and signed-in user at the top of the sidebar, like Medusa. */
export async function StoreSwitcher({ payload, user }: ServerProps) {
  const store = await payload.findGlobal({ slug: "store", depth: 0 });
  const name = store?.name || "Store";
  const email = (user as { email?: string } | undefined)?.email;

  return (
    <div className="sb-store">
      <span className="sb-store__avatar" aria-hidden>
        {name.charAt(0).toUpperCase()}
      </span>
      <span className="sb-store__text">
        <span className="sb-store__name">{name}</span>
        {email && <span className="sb-store__user">{email}</span>}
      </span>
    </div>
  );
}
