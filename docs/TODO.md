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

## Failure cases and security audit follow-ups

From `docs/reference/Switchblade_ backend failure cases.pdf` and the source
security audit (2 Nov 2026, unverified leads; evidence in
`~/security-audit-skill/swithblade-phase2/run-1/`). `CRON_SECRET`, Upstash and
the hourly safety net above are prerequisites for several of these.

### Payments (most important)

- [ ] **Capture inside the order lock.** `recordPayment` captures before the
      advisory lock, so a second payment on the same order can be captured
      and never recorded (no refund, no alert). Capture after the duplicate
      re-check; a losing different payment should be refunded or flagged.
- [ ] **Check the paid amount.** `recordPayment` never compares
      `payment.amount` / currency with the Razorpay order; any shortfall is
      saved as `discountTotal` and the order ships. Reject and alert staff
      instead.
- [ ] **Late payment after the hold expires.** The 12-minute window is only
      a browser option; the server records old orders at the old price and
      flags them oversold. Check the order's age / hold on the server, then
      re-reserve if stock is left, else refund automatically and tell the
      customer.
- [ ] **Refunds in code.** No refund code exists; extra or oversold payments
      are refunded by hand. Add an idempotent refund (keyed by order +
      amount) with retries and a staff alert.

### Checkout and stock

- [ ] **Cap held quantity.** One checkout can hold 500 units of a product
      (50 bag lines × 10 merged), and a guest gets a new holder per request,
      so anyone can lock a product for 15 minutes, repeatedly. Cap the merged
      quantity per product and the active holds per IP / shopper.
- [ ] **Per-customer limit for drops** (max per SKU per order and per
      customer).
- [ ] **Turn off Payload guest carts.** `allowGuestCarts` defaults to true,
      so anyone can create carts through `/api/carts`. Set
      `carts: { allowGuestCarts: false, … }` in `src/payload.config.ts`.
- [ ] **Rate-limit `/api/razorpay/shipping-info`** (public, up to 20
      Shiprocket calls per request), or return 404 while Magic Checkout is
      off.
- [ ] **Shiprocket slow or down:** 5 s timeout and fall back to a cached or
      standard answer instead of blocking checkout (now 8 s, then an error).
- [ ] **Kill switch fails open** when the database read fails; decide
      whether checkout should close instead.
- [ ] **GST**: IGST vs CGST + SGST by shipping state, stored on the order.
- [ ] Drop day: early "sold out" counter and a waiting room for big drops.

### Accounts and sign-in

- [ ] **Guest checkout writes into other accounts.** A guest who types an
      existing customer's email gets the order, phone and address added to
      that account. Only link orders to the signed-in customer; link guest
      orders after the email is verified.
- [ ] **Email linking on sign-up.** The `auth.users` trigger and the app's
      email fallback link a customer row by email without checking it's
      confirmed. Confirm Supabase "Confirm email" is on, and gate linking on
      `email_confirmed_at`. Also check email/phone change and account
      deletion (the trigger re-links by email).
- [ ] **Redirect after login:** `safeNextPath` lets `/%09/evil.example`
      through (tab/newline), which redirects off-site. Parse with `new URL`
      and require the same origin; add tests.
- [ ] **`/auth/confirm` login CSRF:** it signs any browser into the account
      whose `token_hash` is in the link. Remove it (the app's emails use
      `/auth/callback`) or restrict the `type` and bind it to the browser.
- [ ] **Saved checkout address survives sign-out** (`sb:delivery-address` in
      localStorage) and pre-fills for the next person. Clear it on sign-out
      and prefer the signed-in account's email.
- [ ] OTP: offer email login after two failed SMS codes; add Cloudflare
      Turnstile against OTP bots.
- [ ] Account deletion flow: block while orders are open, anonymise after.
- [ ] Optional: sign out other sessions after a password change.

### Bag and catalog

- [ ] Re-check stock when the bag opens and cap quantity to what's in
      stock, with a message on that line (now only at checkout).
- [ ] Cap the guest + account bag merge at available stock.
- [ ] Ask to confirm price drops over 50% in Payload, and keep an audit
      log of price and stock edits.
- [ ] Archive products instead of deleting them (staff can hard-delete
      now).
- [ ] MRP and required fields (size chart, images) before publishing.
- [ ] 301 redirects for old product URLs.

### Operations

- [ ] **Stock ledger:** admins overwrite the stock number, which can wipe
      out sales made at the same time. Use "+5 received" style adjustments.
- [ ] Shipments: reconcile tracking status, "AWB but no pickup after 24 h",
      RTO, lost parcels (all manual now; `deliveredAt` is typed by staff).
- [ ] Returns and exchanges beyond the email request (pickup, QC, refund,
      exchange chains).
- [ ] Check SPF, DKIM and DMARC for the sending domain in DNS.
- [ ] WhatsApp / SMS order messages (none yet; email only).
- [ ] Daily money check: Razorpay settlements vs orders.
- [ ] Playwright checkout test on previews; load test before a sale;
      Vercel Firewall rules for bots and scraping.
- [ ] Small hardening: `permissions: contents: read` in CI and pin actions
      to SHAs; pin `images.remotePatterns` to this project's Supabase host;
      validate `trackingUrl` (https) and swatch colours; reject colours a
      product doesn't offer; validate `deleteAddress`'s id.

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
