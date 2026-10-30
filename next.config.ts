import { withPayload } from "@payloadcms/next/withPayload";
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  // SAMEORIGIN (not DENY) so the Payload admin can preview pages in an iframe.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(self)",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const isDev = process.env.NODE_ENV === "development";

/*
 * Content-Security-Policy, set as a header (no nonces) so pages stay
 * statically cached. Inline scripts are still allowed (Next's own bootstrap
 * needs them without nonces), but scripts, frames and requests can only go
 * to this site and the services listed here, so an injected <script src> or
 * data sent to a stranger's server is blocked.
 */
function contentSecurityPolicy({ admin }: { admin: boolean }) {
  // The admin's JSON/code fields load the Monaco editor from jsDelivr.
  const monaco = admin ? " https://cdn.jsdelivr.net" : "";
  return [
    "default-src 'self'",
    // 'wasm-unsafe-eval': the 3D star's mesh decoder is WebAssembly.
    `script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'${isDev ? " 'unsafe-eval'" : ""} https://checkout.razorpay.com https://cdn.razorpay.com${monaco}`,
    `style-src 'self' 'unsafe-inline'${monaco}`,
    "img-src 'self' data: blob: https://*.supabase.co https://*.razorpay.com",
    `font-src 'self' data:${monaco}`,
    "connect-src 'self' blob: data: https://*.razorpay.com",
    "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com",
    "worker-src 'self' blob:",
    "object-src 'none'",
    "base-uri 'self'",
    // Supabase/Google: sign-in redirects that start from a form post.
    "form-action 'self' https://*.supabase.co https://accounts.google.com",
    // 'self', not 'none': the admin previews storefront pages in an iframe.
    "frame-ancestors 'self'",
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
  experimental: {
    // The storefront and the Payload admin have separate root layouts, so
    // unmatched URLs need app/global-not-found.tsx.
    globalNotFound: true,
  },
  images: {
    formats: ["image/avif", "image/webp"],
    // Product images uploaded to public Supabase Storage buckets.
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        source: "/((?!admin(?:/|$)).*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy({ admin: false }),
          },
        ],
      },
      {
        source: "/admin/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: contentSecurityPolicy({ admin: true }),
          },
        ],
      },
    ];
  },
};

export default withPayload(nextConfig);
