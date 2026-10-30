import type { Route } from "next";
import { redirect } from "next/navigation";
import type { AdminViewServerProps } from "payload";
import { Logo } from "./brand";
import { StaffVerifyForm } from "./staff-verify-form";

type TotpUser = { email?: string; hasTotp?: boolean; _strategy?: string };

/**
 * The authenticator-code screen staff see after their password, replacing
 * payload-totp's plain view. Same rules as the plugin's: signed-out goes to
 * the login page, and anyone without a pending code goes to the dashboard.
 */
export function StaffVerify({
  initPageResult,
  searchParams,
  pluginOptions,
}: AdminViewServerProps & { pluginOptions?: { totp?: { digits?: number } } }) {
  const { config } = initPageResult.req.payload;
  const { admin: adminRoute, api: apiRoute } = config.routes;
  const user = initPageResult.req.user as TotpUser | null;

  if (!user) redirect(`${adminRoute}/login` as Route);
  if (!user.hasTotp || user._strategy === "totp") redirect(adminRoute as Route);

  const back = searchParams?.back;
  const logoutRoute = config.admin.routes.logout;

  return (
    <main className="sb-verify">
      <div className="sb-verify__card">
        <Logo />
        <div className="sb-verify__icon" aria-hidden>
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6L12 3Z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>
        <div className="sb-verify__heading">
          <h1>Two-step verification</h1>
          <p>
            Open your authenticator app and enter the code shown for{" "}
            <strong>Switchblade Admin</strong>
            {user.email ? (
              <>
                {" "}
                (<span className="sb-verify__email">{user.email}</span>)
              </>
            ) : null}
            .
          </p>
        </div>
        <StaffVerifyForm
          adminRoute={adminRoute}
          apiRoute={apiRoute}
          back={typeof back === "string" ? back : undefined}
          length={pluginOptions?.totp?.digits ?? 6}
        />
        <p className="sb-verify__help">
          Lost your phone? Ask an admin to reset your authenticator, then set it
          up again.
        </p>
      </div>
      <a className="sb-verify__signout" href={`${adminRoute}${logoutRoute}`}>
        Not you? Sign out
      </a>
    </main>
  );
}
