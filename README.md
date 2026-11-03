# Avelune

Meticulously planned summer journeys for groups of families. This repo is the
public site. **Stage 1** (this build) is a teaser landing page that collects
early-access signups. Later stages add refundable deposits and a family portal.

## Run it

```bash
pnpm install
cp .env.example .env.local   # optional: everything works without it
pnpm dev                     # http://localhost:3000
```

Without `DATABASE_URL`, signups are appended to `.data/signups.jsonl` (gitignored).

## Scripts

| Command | What it does |
| --- | --- |
| `pnpm dev` / `pnpm build` / `pnpm start` | Next.js 16 (Turbopack) |
| `pnpm typecheck` · `pnpm lint` · `pnpm test` | tsc, eslint, vitest |
| `pnpm db:generate` | Regenerate SQL migrations from `src/db/schema.ts` |
| `pnpm db:migrate` | Apply migrations in `drizzle/` to `DATABASE_URL` |
| `pnpm signups:export > signups.csv` | Dump signups (Postgres or the local file) as CSV |
| `pnpm admin:set-password` | Set the owner password for `/admin` (Railway, or `--local` for `.env.local`) |

## Environment

See `.env.example`. All optional in development.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres (Supabase, Neon, Railway, Vercel Postgres). Use a pooled URL; the client runs with `prepare: false`. |
| `RESEND_API_KEY`, `EMAIL_FROM` | Sends the "you're on the list" email. Before your domain is verified use `onboarding@resend.dev`. |
| `SIGNUP_NOTIFY_EMAIL` | One-line notification to you for every new signup. |
| `SIGNUP_IP_SALT` | Salt for the hashed IP stored with each signup (set any random string in production). |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL for Open Graph tags and Stripe return URLs. |
| `DEPOSITS_ENABLED`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | Turn on refundable deposits; see Deposits below. |
| `DEPOSIT_AMOUNT_CENTS`, `DEPOSIT_CURRENCY`, `DEPOSIT_HOLD_DAYS` | Deposit terms (placeholder defaults: 100000, usd, 14). |
| `ADMIN_PASSWORD_HASH`, `ADMIN_SESSION_SECRET` | Owner login for `/admin`. Set both with `pnpm admin:set-password`; see Admin below. |

## Deploy

**Where it runs today.** GitHub `jessecalder/avelune` (branch `main`) deploys automatically to the Railway project
`avelune` (workspace "jessecalder's Projects"): service `web` plus a `Postgres` service. The site answers at
https://avelunefamily.com (registered at Cloudflare Registrar, Cloudflare DNS with the two CNAMEs proxied; www redirects
to the bare domain in `next.config.ts`) and still at https://web-production-d11ee.up.railway.app. `SITE_NOINDEX=true`
keeps it out of search engines until launch. Variables are managed with
`railway variable set KEY=value --service web` from this directory (it is linked to the project) or in the Railway
dashboard. Never paste secrets into chat or commit them: put them in `.env.local` and push them up with the CLI.

The generic steps, for any host:

1. Create a Postgres database and run `DATABASE_URL=... pnpm db:migrate` once.
2. Set the environment variables above on the host (`NEXT_PUBLIC_SITE_URL` must be the public origin).
3. Verify the sending domain in Resend and set `EMAIL_FROM` to e.g. `Avelune <hello@avelunefamily.com>`.
4. Check `GET /api/health`: it returns `{ ok, store, deposits, version, time }`. `store` should read `postgres` in production.

**Railway.** `railway.json` sets the build (`pnpm install --frozen-lockfile && pnpm build`), a `/api/health`
healthcheck, and a start command of `pnpm db:migrate && pnpm start`: migrations run every time a container starts
(Drizzle skips the ones already applied), and a failing migration stops the container before it takes traffic.
The pre-deploy hook was tried first and was not honoured on this service, which is why the migration lives in the
start command. Migrations use `tsx`, a dev dependency; keep dev dependencies installed in the build image.
`.node-version` pins Node 20.

**Vercel.** Import the repo and set the variables. Vercel has no pre-deploy hook for this, so run
`DATABASE_URL=<prod url> pnpm db:migrate` from CI or locally before promoting a deploy that changes `src/db/schema.ts`.
Point the Stripe webhook at the production domain, not a preview URL.

## Deposits (stage 2 groundwork)

Founding families can hold a place with a refundable Stripe Checkout deposit. It is off by default and needs
Postgres: the `reservations` and `stripe_events` tables come from `pnpm db:migrate`.

**Wiring a Stripe account (staging or production).** Put the secret key in `.env.local` as `STRIPE_SECRET_KEY`, then run
`pnpm stripe:setup` (or `--dry-run` first). It checks the account, registers the webhook endpoint at
`https://avelunefamily.com/api/stripe/webhook` with the three events below, and pushes `STRIPE_SECRET_KEY` and
`STRIPE_WEBHOOK_SECRET` to the Railway `web` service without printing either. `--rotate` replaces the endpoint to get a
fresh signing secret; `--url` targets another origin. Then set the `DEPOSIT_*` variables and `DEPOSITS_ENABLED=true`.

Enable it locally in Stripe test mode:

1. In the Stripe dashboard, switch to test mode and copy the secret key into `STRIPE_SECRET_KEY`.
2. Set `DEPOSITS_ENABLED=true`, `DATABASE_URL` and `NEXT_PUBLIC_SITE_URL=http://localhost:3000`. Optionally set
   `DEPOSIT_AMOUNT_CENTS`, `DEPOSIT_CURRENCY` and `DEPOSIT_HOLD_DAYS` (defaults: 100000, usd, 14; the amount is a placeholder).
3. Forward webhooks to the dev server and copy the printed `whsec_…` secret into `STRIPE_WEBHOOK_SECRET`:

   ```bash
   stripe listen --forward-to localhost:3000/api/stripe/webhook
   ```

4. Open `/deposit` (add `?token=<confirm token>` to link the deposit to an early-access signup). Pay with the test
   card `4242 4242 4242 4242`, any future expiry and any CVC.

For a deployed endpoint, create a webhook in the dashboard pointing at `https://<domain>/api/stripe/webhook` and
subscribe it to exactly these events:

- `checkout.session.completed` marks the reservation paid and starts the hold.
- `checkout.session.expired` marks an unpaid reservation expired.
- `charge.refunded` marks the reservation refunded once the charge is fully refunded.

Checkout is restricted to card, so no delayed-notification (bank debit) events need handling. Out-of-order
deliveries are safe: a completion event cannot revive a refunded deposit, and a refund that arrives before its
completion is matched by the reservation id in the charge metadata or retried by Stripe.

Each event id is stored in `stripe_events`, so Stripe's retries are safe. Refunds are issued from the Stripe
dashboard; the webhook only records them. The pages are `/deposit`, `/deposit/success` and `/deposit/cancelled`,
all `noindex`, and `/deposit` shows the "not open yet" copy whenever deposits are disabled or unconfigured.

## Admin

`/admin` is an owner-only area (overview now; early access, families, trips, vendors and deposits pages come later).
There is no third-party auth service: one owner password, stored as a scrypt hash, and a signed 12-hour cookie.
Admin is disabled until
both `ADMIN_PASSWORD_HASH` and `ADMIN_SESSION_SECRET` (at least 32 characters) exist: the login page then says "Admin is not set up yet." and nothing signs in.
Sign-in attempts are limited to 5 per 15 minutes per network, and to 100 wrong passwords per 15 minutes in total.
If you are ever shown "Too many attempts", wait 15 minutes or restart the `web` service (the counters live in memory).

```bash
pnpm admin:set-password            # prompts twice (14+ characters, echo off), pushes both variables to Railway
pnpm admin:set-password --local    # writes them to .env.local instead
pnpm admin:set-password --keep-session   # change the password but keep everyone signed in
```

The script never prints the values; redeploy afterwards (`railway redeploy --service web`). A new session secret
signs out every session, which is also how to revoke access quickly. Then sign in at `/admin/login` (for example
https://avelunefamily.com/admin). The area is `noindex`, disallowed in `robots.txt`, and never cached. Login is rate
limited (5 attempts per IP and 30 overall per 15 minutes, per process). `src/proxy.ts` is only the first gate: every
admin page that reads data and every admin server action calls `requireAdmin()` from `src/lib/admin/auth.ts`.

## How the site is put together

- `src/app/page.tsx` renders `MaisonPage`, which assembles the sections in `src/components/maison/`.
- All copy lives in `src/content/site.ts`; all photography in `src/content/photos.ts`.
- `src/components/Photo.tsx` renders manifest photos. Stage 1 hotlinks free
  Unsplash photos (Unsplash License); replace an entry's `src` with a local
  file under `public/` when licensed photography arrives.
- Signups: `src/app/actions/early-access.ts` (server actions) →
  `src/lib/signups/` (validation, rate limiting, store adapters, email) →
  `src/db/schema.ts` (Drizzle table `signups`).
- Fonts: Playfair Display (display) + Jost (text) via `next/font`, tokens in
  `src/app/globals.css` (`@theme`).
- Type trial: `/type` (noindex) shows candidate display faces; `/type/<slug>` renders the full
  page in one of them. Its extra fonts load only on those routes (`src/app/type/fonts.ts`).

## Roadmap

1. **Interest** (now): teaser page, early-access list, welcome email, CSV export.
2. **Deposits**: trip pages with dates, Stripe Checkout for a refundable hold,
   magic-link email to return to a reservation, `reservations` table keyed to
   `signups.id`.
3. **Portal**: authenticated family accounts (children's ages, documents,
   dietary notes), payment schedules, itinerary and messaging, new destinations.

## Photo credits

Photographers are credited in the site footer and in `src/content/photos.ts`.
Stock photos containing identifiable people, especially children, should be
replaced with licensed, model-released photography before paid marketing.
