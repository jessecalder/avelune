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

## Environment

See `.env.example`. All optional in development.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres (Supabase, Neon, Railway, Vercel Postgres). Use a pooled URL; the client runs with `prepare: false`. |
| `RESEND_API_KEY`, `EMAIL_FROM` | Sends the "you're on the list" email. Before your domain is verified use `onboarding@resend.dev`. |
| `SIGNUP_NOTIFY_EMAIL` | One-line notification to you for every new signup. |
| `SIGNUP_IP_SALT` | Salt for the hashed IP stored with each signup (set any random string in production). |
| `NEXT_PUBLIC_SITE_URL` | Canonical URL for Open Graph tags. |

## Deploy

1. Create a Postgres database and run `DATABASE_URL=... pnpm db:migrate` once.
2. Deploy to Vercel (`vercel`) or Railway (Nixpacks detects Next.js; start command `pnpm start`). Set the variables above.
3. Verify the sending domain in Resend and set `EMAIL_FROM` to e.g. `Avelune <hello@avelune.com>`.

## How the site is put together

- `src/app/page.tsx` assembles the sections in `src/components/`.
- All copy lives in `src/content/site.ts`; all photography in `src/content/photos.ts`.
- `src/components/Photo.tsx` renders manifest photos. Stage 1 hotlinks free
  Unsplash photos (Unsplash License); replace an entry's `src` with a local
  file under `public/` when licensed photography arrives.
- Signups: `src/app/actions/early-access.ts` (server actions) →
  `src/lib/signups/` (validation, rate limiting, store adapters, email) →
  `src/db/schema.ts` (Drizzle table `signups`).
- Fonts: Fraunces (display) + Instrument Sans (text) via `next/font`, tokens in
  `src/app/globals.css` (`@theme`).

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
