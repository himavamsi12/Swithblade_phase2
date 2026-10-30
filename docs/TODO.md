# To do later

Tasks parked for later. Tick them off (`[x]`) when done.

## Before launch

- [ ] **Custom SMTP for Supabase Auth emails.** Supabase's built-in sender
      only delivers to the project team's own addresses, a few per hour, so
      customers don't get sign-up confirmation or password-reset emails.
  - Supabase → Authentication → Emails → **SMTP Settings** → enable custom
    SMTP.
  - Host `smtp.resend.com`, port `465`, username `resend`, password: a
    Resend API key (create one in Resend → API Keys; don't commit it).
  - Sender email on a domain verified in Resend → Domains (e.g.
    `no-reply@yourdomain.com`), sender name `Swithblade`.
  - Test: request a password reset for your own email, open the link, set a
    new password, sign in with it.
- [ ] **Fix `NEXT_PUBLIC_SITE_URL`.** Vercel (Production) still has the
      login-protected `…git-main…` URL, so auth email links, Razorpay links and
      the sitemap point there.
  - Vercel → Settings → Environment Variables → set it to
    `https://swithblade-phase2.vercel.app` (or your own domain), then
    redeploy.
  - Supabase → Authentication → URL Configuration → same **Site URL**, and
    add `https://swithblade-phase2.vercel.app/auth/callback` to **Redirect
    URLs**.
- [ ] **Add `CRON_SECRET` in Vercel** (any long random string), so the daily
      job recovers missed payments, retries shipping/emails and purges old
      stock holds.
- [ ] **Add the Upstash vars in Vercel** (`UPSTASH_REDIS_REST_URL`,
      `UPSTASH_REDIS_REST_TOKEN`), so sign-in, password reset, OTP and
      checkout are rate-limited.
- [ ] **Policy pages and support email**: real business name, address and a
      support email you own (`support@switchblade.com` is in
      `src/config/site.ts`).
- [ ] **Delete the "Test Tee" test product** (and its variants and photos)
      in `/admin`.

## Testing (Razorpay test mode)

- [ ] One payment: order in `/admin`, stock down, hold shows "Sold".
- [ ] Two browsers, last unit: the second gets "in someone else's checkout".
- [ ] Resend the `order.paid` webhook: still one order, one stock deduction.
- [ ] Shared bag: add on phone, see it on laptop (signed in).

## Clean-up

- [ ] Test Tee's sample photos were uploaded locally, so they're broken on
      the live site. Re-upload in the live admin, or set the `S3_*` vars in
      `.env.local` and rerun `pnpm payload run
src/payload/scripts/seed-test-product.ts`.
- [ ] Delete the extra 19th Test Tee variant if it was a test.

## Products

- [ ] **2JZ Archival T-Shirt photos on the live site.** The product (published in New Arrivals,
      ₹1,999, Red/Blue × S–2XL, 10 each) was added from `2JZ T-Shirt.docx`,
      but its 5 photos were uploaded to local `./media`, so the live admin
      and shop show it without photos. Set the `S3_*` vars in `.env.local` (same
      values as Vercel), then run
      `pnpm payload run src/payload/scripts/seed-2jz-tee.ts photos` (swaps
      in fresh uploads). Or re-upload `public/images/products/2jz-archival-tee/*`
      in the live admin.
- [x] **Publish the 2JZ Archival T-Shirt** in the New Arrivals collection.
- [ ] Optional: higher-resolution photos. The doc's are ~380×480 px, which
      look soft on large screens.
