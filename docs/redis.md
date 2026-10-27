# Upstash Redis

The site uses [Upstash Redis](https://upstash.com) as a small, fast store
that **every server instance shares**. On Vercel, the site runs on many short-lived
server instances. Each one has its own memory, which is lost when it shuts down.
Redis gives them one shared memory. We use it for two jobs:

1. **Rate limiting:** stop bots and abuse on sign-in, password reset and checkout.
2. **Caching Shiprocket data:** the Shiprocket login token and PIN code delivery checks.

Redis is **optional**. If the keys are missing, or Redis is down or slow, the
site keeps working: rate limits switch off and Shiprocket data falls back to
each server's own memory. A Redis problem never stops a shopper from signing in
or paying.

---

## Setup

Environment variables (in `.env.local` and in Vercel → Settings → Environment Variables):

```
UPSTASH_REDIS_REST_URL=https://<your-db>.upstash.io
UPSTASH_REDIS_REST_TOKEN=<token>
```

From the Upstash console → your database → **REST API**. Use the normal token,
not the read-only one. The `KV_REST_API_URL` / `KV_REST_API_TOKEN` names that
Vercel's Upstash integration adds also work.

Packages: `@upstash/redis`, `@upstash/ratelimit`.

Every key starts with `sb:`, so the database can be shared with other projects.

---

## Where it is used

| Where                                                                | What Redis does     | File                                                    |
| -------------------------------------------------------------------- | ------------------- | ------------------------------------------------------- |
| Sign in / create account form                                        | Rate limit          | `src/features/auth/actions.ts` → `continueWithEmail`    |
| Forgot password form                                                 | Rate limit          | `src/features/auth/actions.ts` → `sendPasswordReset`    |
| Bag page → Checkout button                                           | Rate limit          | `src/features/checkout/actions.ts` → `createCheckout`   |
| Shiprocket API login                                                 | Shared token cache  | `src/features/shipping/shiprocket.ts` → `getToken`      |
| PIN code delivery check (checkout + Razorpay shipping-info endpoint) | Shared result cache | `src/features/shipping/shiprocket.ts` → `isServiceable` |

Shared building blocks:

| File                    | Purpose                                                                                                                                                   |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/redis.ts`      | Creates the Redis client (or `null` when not configured). `cacheGet` / `cacheSet` / `cacheDelete` helpers that log errors instead of failing the request. |
| `src/lib/rate-limit.ts` | The limits table, `rateLimit(name, ...ids)` and `clientIp()`.                                                                                             |

---

## 1. Rate limiting

Uses a **sliding window**: "N attempts in the last X minutes". Each attempt is
counted against the visitor's **IP address**, and also against the **email**
where there is one. The request is blocked if either count is over the limit.

| Limit           | Allowed       | Counted per  | Why                                                                                    |
| --------------- | ------------- | ------------ | -------------------------------------------------------------------------------------- |
| `signIn`        | 10 per 10 min | IP and email | Slows down password guessing on an account.                                            |
| `passwordReset` | 3 per 15 min  | IP and email | Stops the form being used to flood someone's inbox.                                    |
| `checkout`      | 15 per 10 min | IP           | Every attempt creates a Razorpay order and makes a Shiprocket call; stops spam orders. |

When a limit is hit, the shopper sees:

- Sign in / reset: _"Too many attempts. Please wait a few minutes and try again."_
- Checkout: _"Too many checkout attempts. Please wait a few minutes."_

To change a limit, edit the `LIMITS` table in `src/lib/rate-limit.ts`.

> **Not to be confused with Supabase's own email limit.** The message _"Please
> wait **a minute**"_ comes from Supabase, not Redis. It shows when Supabase's
> built-in email service refuses to send another email so soon. Fix that by setting
> up your own email sender in Supabase (Authentication → Emails → SMTP) before launch.

Redis keys: `sb:rl:<limit>:ip:<ip>:…` and `sb:rl:<limit>:email:<email>:…`, removed
automatically when the window ends.

---

## 2. Shiprocket login token

Shiprocket's API needs a login token, valid for 10 days. Before Redis, each
server instance kept the token only in its own memory. So every new instance
(and Vercel starts them all the time) logged in to Shiprocket again before it
could check a PIN code or create a shipment.

Now:

1. The server checks its own memory first.
2. Then Redis (`sb:shiprocket:token`). One login is shared by all instances.
3. Only if both miss does it log in, and it saves the token to Redis for 9 days.
4. If Shiprocket rejects the token (e.g. after a password change), it is removed
   from Redis and the server logs in once more.

**Benefit:** fewer Shiprocket logins, and faster first requests on new instances.

---

## 3. PIN code delivery check

Before taking an order, the site asks Shiprocket whether any courier delivers to the
shopper's PIN code. The answer is cached for **1 hour**, per PIN code and parcel
weight (`sb:shiprocket:serviceable:<pincode>:<weightKg>`), in memory and in Redis.

**Benefit:** measured locally, the first check for 110001 took **1.69 s** (login + Shiprocket
call); the repeat took **0.003 s**. Every server instance now shares the answer, so
each PIN code is checked with Shiprocket once an hour instead of once per
instance.

**Outage safety:** if Shiprocket returns an error (5xx or 429), nothing is cached.
The shopper sees _"Couldn't check delivery to your PIN code. Please try again."_
rather than a wrong _"We don't deliver here"_ that would stick for an hour.

---

## Deliberately not in Redis

- **Product catalog:** already cached by Next.js (60-second cache, tagged `products`),
  which Vercel shares across instances. A Redis copy would be a second cache that can
  go out of date without making anything faster.
- **Duplicate payment protection:** a database unique index already guarantees one
  order per Razorpay order. Shiprocket only receives an order the first time it is
  recorded, so Razorpay webhook retries are safe.

---

## Checking it

List what the site has stored in Redis (Upstash console → Data Browser, filter `sb:*`).
You should see the Shiprocket token, PIN code entries, and `sb:rl:*` counters after
sign-in, reset or checkout attempts.

Quick test of a limit: submit the forgot-password form 4 times within 15 minutes (wait
over a minute between tries so Supabase's own email limit doesn't answer first). The
4th attempt shows _"Too many attempts. Please wait a few minutes and try again."_
