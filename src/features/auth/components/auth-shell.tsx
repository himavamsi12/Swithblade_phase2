import type { ReactNode } from "react";

/** Page frame shared by the account screens: title, divider, centred column. */
export function AuthShell({
  title = "Login or Create Account",
  heading,
  intro,
  children,
}: {
  title?: string;
  heading: string;
  intro?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-480 px-4 pb-24 md:px-12 md:pb-40">
      <h1 className="border-b border-stroke pt-10 pb-5 text-center text-h3 font-semibold md:pt-14">
        {title}
      </h1>
      <div className="mx-auto mt-16 w-full max-w-[365px] md:mt-24">
        <h2 className="text-center text-h5 font-semibold">{heading}</h2>
        {intro && (
          <p className="mt-3 text-center text-body-1 text-muted md:-mx-8">
            {intro}
          </p>
        )}
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}
