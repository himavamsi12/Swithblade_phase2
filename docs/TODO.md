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
- [ ] **Add `CRON_SECRET` in Vercel** (any long random string), then
      redeploy. Without it the daily safety-net job is refused every time, so
      paid orders the checkout and webhook missed aren't recovered, failed
      Shiprocket hand-offs and confirmation emails aren't retried, staff
      aren't emailed about stuck orders, and old stock holds aren't purged.
- [ ] **Connect Upstash Redis in Vercel** (Storage / Marketplace → Upstash
      Redis, which adds the vars itself; no code change). Without it every
      rate limit is off: sign-in attempts, OTP texts (each costs money, and a
      phone number can be flooded), password-reset emails and checkout.
- [ ] **Check the Razorpay setup.** `.env.local` uses test keys; make sure
      Vercel (Production) has `rzp_live_…` keys before launch. In the
      Razorpay dashboard → Webhooks, the webhook should point to
      `https://swithblade-phase2.vercel.app/api/razorpay/webhook` with
      **payment.authorized**, **payment.captured** and **order.paid** ticked
      (the endpoint is on and checks signatures).
- [ ] **Run the safety-net job more often than daily.** Vercel Hobby only
      allows a daily cron, so a missed order can wait up to 24 hours. Upgrade
      to Vercel Pro and make the `vercel.json` schedule hourly, or have a free
      external scheduler call `/api/cron/retry-orders` hourly with
      `Authorization: Bearer <CRON_SECRET>`.
- [ ] **Turn on database backups before launch.** Supabase Free has no
      backups, so a bad migration or accidental delete loses every order and
      customer. Upgrade to Supabase Pro (daily backups, kept 7 days), then
      check Dashboard → Database → Backups shows them. Until then, take a
      manual `pg_dump` before risky changes.
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

- [x] Test Tee's sample photos were only in local `./media`; `pnpm media:sync`
      uploaded them to storage, so they show on the live site.
- [ ] Delete the extra 19th Test Tee variant if it was a test.

## Products

- [x] **2JZ Archival T-Shirt photos on the live site.** They were only in
      local `./media`; `pnpm media:sync` uploaded them to storage.
- [x] **Publish the 2JZ Archival T-Shirt** in the New Arrivals collection.
- [ ] Optional: higher-resolution photos. The doc's are ~380×480 px, which
      look soft on large screens.
