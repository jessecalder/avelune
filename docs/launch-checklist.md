# Launch checklist

Owner checklist, in order. "Owner" means a decision or account only you can make; "Claude" means the repo work is
already done or can be done on request. Tick as you go.

## 1. Name and domain

- [x] Owner (2026-11-02): chose **avelunefamily.com**.
- [x] Owner (2026-11-03): registered avelunefamily.com at Cloudflare Registrar (sold at cost, free WHOIS privacy, Cloudflare DNS, which Railway
  supports for a bare-domain CNAME). Registry check 2026-11-02/03 (RDAP and whois):
  - Taken: avelune.com (parked at GoDaddy/Afternic, for sale: $49,850 buy-now, $1,081/month lease, or offer; renews 2027-03-03),
    avelune.net (a Chilean Minecraft fan server), avelune.co (registered 2026-06-15, GoDaddy; the 2026-10-11 "free" result was wrong),
    avelune.world, avelune.co.uk, avelune.es, avelunetravel.com (2026-09-10, Cloudflare, Google Workspace mail), getavelune.com, theavelune.com.
  - Free: avelunejourneys.com, avelunefamily.com, avelunefamilies.com, joinavelune.com, visitavelune.com, avelune.travel
    (travel-industry self-certification, about $115/yr at cost), avelune.family (about $30/yr). Premium status unverified.
  - Avelune names are being registered by others through 2026, so buy the chosen name promptly.
- [ ] Owner: on Railway the project is on the Hobby plan (2 custom domains per service: the bare domain plus www).
- [x] Claude (2026-11-02): `site.contactEmail` is hello@avelunefamily.com; it works once Email Routing forwards it (step 5).
- [x] Claude (2026-11-02): avelunefamily.com and www.avelunefamily.com added to the Railway `web` service; www redirects to the
  bare domain in `next.config.ts`. DNS records to add in Cloudflare after purchase (all DNS only, grey cloud):
  - `CNAME` `@` → `4nyd8zff.up.railway.app`
  - `TXT` `_railway-verify` → `railway-verify=fb4313fdddd180b779d362634f034c3062c0ba8edf712122218481ea72246fbc`
  - `CNAME` `www` → `48bzslf9.up.railway.app`
  - `TXT` `_railway-verify.www` → `railway-verify=ed8bd4ab8499f79df29e520f14a96097ebd8f80928130d841ac157ae8001cf8c`
  Check with `railway domain status avelunefamily.com --service web`.
- [x] Owner (2026-11-03): DNS records added (the CNAMEs are proxied, which Railway supports). Railway verified both names and
  issued certificates within two minutes.
- [x] Claude (2026-11-03): `NEXT_PUBLIC_SITE_URL=https://avelunefamily.com` set on Railway; https://avelunefamily.com is live.
- [ ] Owner: trademark check on "Avelune" in the travel and children's services classes (US, EU, Guatemala) before
  paid marketing. A professional search is worth the cost. USPTO, 2026-11-02: no AVELUNE filing in classes 39 or 43, but live
  intent-to-use applications exist in class 16 (art prints, Avelune Living LLC, 99918133), class 14 (jewelry, 99910425) and
  class 10 (beauty devices, 50036888). An attorney should clear the name and file in classes 39 and 43.

## 2. DNS

- [ ] Owner: point the domain's nameservers at Cloudflare (or the registrar's DNS) and enable DNSSEC.
- [ ] Owner: add the DNS records the host asks for (step 3) and the Resend records (step 5).

## 3. Hosting

- [x] Claude (2026-10-13): hosting project created on Railway (`avelune`, services `web` + `Postgres`), GitHub
  `jessecalder/avelune` linked for auto-deploys from `main`, staging URL https://web-production-d11ee.up.railway.app.
- [x] Owner (2026-10-13): design direction chosen: Maison. Claude promotes it to `/`; the other concepts are removed before launch. Maison promoted to /, other concepts removed (2026-10-13).
- [ ] Owner: the GitHub repo was created as **public**. Make it private unless you want the code and copy visible:
  `gh repo edit jessecalder/avelune --visibility private`.
- [x] Claude: `DATABASE_URL` (linked to the Postgres service), `NEXT_PUBLIC_SITE_URL`, `SIGNUP_IP_SALT`, `SITE_NOINDEX=true` are set.
- [ ] Owner: add the email variables once Resend is ready (step 5): `RESEND_API_KEY`, `EMAIL_FROM`, `SIGNUP_NOTIFY_EMAIL`.
- [ ] Owner: attach the custom domain (`railway domain <your-domain> --service web` prints the DNS records) and confirm HTTPS works;
  then set `NEXT_PUBLIC_SITE_URL` to it and remove `SITE_NOINDEX` at launch.
- [ ] Claude: confirm `GET /api/health` returns `ok: true` and `store: "postgres"` on the live URL.

## 4. Postgres

- [x] Claude (2026-10-13): Railway Postgres provisioned in the project; `DATABASE_URL` references it.
- [x] Claude (2026-10-13): migrations applied; tables `signups`, `reservations`, `stripe_events` exist. Future migrations run at container start.
- [ ] Owner: turn on automated backups and check the plan keeps them long enough.
- [ ] Owner: submit a test signup on the live site and confirm the row appears (`pnpm signups:export`).

## 5. Email (Resend)

- [ ] Owner: add the sending domain in Resend and publish its SPF and DKIM records.
- [ ] Owner: publish a DMARC record (start with `p=none` and a reporting address, tighten later).
- [ ] Owner: set `EMAIL_FROM` to an address on that domain, for example `Avelune <hello@avelunefamily.com>`.
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
- [x] Owner: copy the test-mode secret key into `STRIPE_SECRET_KEY`. Hand keys over by writing them into `.env.local`
  in the repo folder (gitignored) and telling Claude, who pushes them to Railway with `railway variable set`; or set them
  yourself in the Railway dashboard under the `web` service. Never paste keys into chat. (Test key in, 2026-11-03.)
- [x] Webhook endpoint at `https://<domain>/api/stripe/webhook`: `pnpm stripe:setup` creates or updates it and pushes
  `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to Railway. Events: `checkout.session.completed`,
  `checkout.session.expired`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`
  (bank payments through payment links) and `charge.refunded`. Done in test mode 2026-11-03; run it again with the
  live key at launch (`--rotate` for a fresh signing secret).
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
- [ ] Claude, just before the live keys go in: clear any test-mode Stripe customers saved on families, which live keys
  cannot use: `UPDATE families SET stripe_customer_id = NULL WHERE stripe_customer_id IS NOT NULL;`. The app no
  longer saves test-mode customers, and a payment link whose saved customer Stripe rejects forgets it and makes a new
  one, so this only catches ids stored before that fix.

## 8. Content and legal

- [ ] Owner: read the privacy page (`/privacy`) against what the site now collects; it does not yet mention payments
  or Stripe. Add that before deposits open.
- [ ] Owner: decide the founding-family cap (how many families, per journey) and how it is communicated; the site
  says "short list" without a number.
- [ ] Owner: decide on analytics. None is installed and the privacy page says there is no advertising tracking; if you
  add any, update the privacy page first.
- [ ] Owner: replace the stock Unsplash photography with licensed or commissioned, model-released photography before
  paid marketing, especially anything showing people.
