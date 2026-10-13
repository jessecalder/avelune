# Launch checklist

Owner checklist, in order. "Owner" means a decision or account only you can make; "Claude" means the repo work is
already done or can be done on request. Tick as you go.

## 1. Name and domain

- [ ] Owner: verify the domain situation before buying anything. As of 2026-10-11, avelune.com was registered by a
  third party in March 2025 and avelune.net in May 2026. avelune.co, avelune.travel and avelune.family showed no
  registration on 2026-10-11; confirm with a registrar and register the one you want.
- [ ] Owner: decide the public contact address. `site.contactEmail` in `src/content/site.ts` currently says hello@avelune.com,
  which you may not control. Change it (and `EMAIL_FROM`) to the domain you actually own.
- [ ] Owner: trademark check on "Avelune" in the travel and children's services classes (US, EU, Guatemala) before
  paid marketing. A professional search is worth the cost.

## 2. DNS

- [ ] Owner: point the domain's nameservers at Cloudflare (or the registrar's DNS) and enable DNSSEC.
- [ ] Owner: add the DNS records the host asks for (step 3) and the Resend records (step 5).

## 3. Hosting

- [x] Claude (2026-10-13): hosting project created on Railway (`avelune`, services `web` + `Postgres`), GitHub
  `jessecalder/avelune` linked for auto-deploys from `main`, staging URL https://web-production-d11ee.up.railway.app.
- [x] Owner (2026-10-13): design direction chosen: Maison. Claude promotes it to `/`; the other concepts are removed before launch.
- [ ] Owner: the GitHub repo was created as **public**. Make it private unless you want the code and copy visible:
  `gh repo edit jessecalder/avelune --visibility private`.
- [x] Claude: `DATABASE_URL` (linked to the Postgres service), `NEXT_PUBLIC_SITE_URL`, `SIGNUP_IP_SALT`, `SITE_NOINDEX=true` are set.
- [ ] Owner: add the email variables once Resend is ready (step 5): `RESEND_API_KEY`, `EMAIL_FROM`, `SIGNUP_NOTIFY_EMAIL`.
- [ ] Owner: attach the custom domain (`railway domain <your-domain> --service web` prints the DNS records) and confirm HTTPS works;
  then set `NEXT_PUBLIC_SITE_URL` to it and remove `SITE_NOINDEX` at launch.
- [ ] Claude: confirm `GET /api/health` returns `ok: true` and `store: "postgres"` on the live URL.

## 4. Postgres

- [x] Claude (2026-10-13): Railway Postgres provisioned in the project; `DATABASE_URL` references it.
- [ ] Claude: confirm the pre-deploy migration ran (tables `signups`, `reservations`, `stripe_events` exist).
- [ ] Owner: turn on automated backups and check the plan keeps them long enough.
- [ ] Owner: submit a test signup on the live site and confirm the row appears (`pnpm signups:export`).

## 5. Email (Resend)

- [ ] Owner: add the sending domain in Resend and publish its SPF and DKIM records.
- [ ] Owner: publish a DMARC record (start with `p=none` and a reporting address, tighten later).
- [ ] Owner: set `EMAIL_FROM` to an address on that domain, for example `Avelune <hello@yourdomain>`.
- [ ] Owner: set `SIGNUP_NOTIFY_EMAIL` to the inbox that should hear about every signup.
- [ ] Owner: sign up with a personal address and check the welcome email lands in the inbox, not spam.

## 6. Business, bank and books

- [ ] Owner: form the business entity (and note the state or country) before taking money.
- [ ] Owner: open a business bank account in that entity's name.
- [ ] Owner: choose accounting software (QuickBooks, Xero, Mercury plus a bookkeeper, or similar) and connect the bank and Stripe.
- [ ] Owner: ask an accountant or lawyer about travel-industry rules: seller-of-travel registration, trust or escrow
  requirements for customer deposits, sales tax or VAT, and insurance. These vary by state and country.

## 7. Stripe

- [ ] Owner: create the Stripe account and finish business verification (needs the entity and bank account from step 6).
- [ ] Owner: copy the test-mode secret key into `STRIPE_SECRET_KEY`. Hand keys over by writing them into `.env.local`
  in the repo folder (gitignored) and telling Claude, who pushes them to Railway with `railway variable set`; or set them
  yourself in the Railway dashboard under the `web` service. Never paste keys into chat.
- [ ] Owner: create a webhook endpoint at `https://<domain>/api/stripe/webhook` subscribed to `checkout.session.completed`,
  `checkout.session.expired` and `charge.refunded`; copy its signing secret into `STRIPE_WEBHOOK_SECRET`.
- [ ] Owner: decide the deposit amount, currency and hold length, and set `DEPOSIT_AMOUNT_CENTS`, `DEPOSIT_CURRENCY`,
  `DEPOSIT_HOLD_DAYS`. The default amount of 100000 cents is a placeholder. If the hold length is not fourteen days,
  update the copy in `src/content/site.ts` too (hero, founding perks, FAQ and `deposit` all say fourteen).
- [ ] Owner: write the refund policy in plain words and have it reviewed. The deposit page promises a full refund
  inside the hold window; say how a family asks for it, how fast it is paid back, and what happens after the window.
  Add it to the deposit page copy.
- [ ] Owner: run a full test-mode deposit with the Stripe test card, refund it from the dashboard, and check the
  reservation moves to `paid` and then `refunded`.
- [ ] Owner: when ready to go live, swap in the live secret key and a live-mode webhook secret, set `DEPOSITS_ENABLED=true`,
  and run one real small deposit and refund of your own.

## 8. Content and legal

- [ ] Owner: read the privacy page (`/privacy`) against what the site now collects; it does not yet mention payments
  or Stripe. Add that before deposits open.
- [ ] Owner: decide the founding-family cap (how many families, per journey) and how it is communicated; the site
  says "short list" without a number.
- [ ] Owner: decide on analytics. None is installed and the privacy page says there is no advertising tracking; if you
  add any, update the privacy page first.
- [ ] Owner: replace the stock Unsplash photography with licensed or commissioned, model-released photography before
  paid marketing, especially anything showing people.
