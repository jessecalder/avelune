/**
 * One-time Stripe wiring for the deposit flow, so keys never pass through chat.
 *
 *   1. Put STRIPE_SECRET_KEY in .env.local (gitignored). Test key first.
 *   2. pnpm stripe:setup            # registers the webhook, pushes both secrets to Railway
 *      pnpm stripe:setup --dry-run  # checks the key and the endpoint, changes nothing on Railway
 *      pnpm stripe:setup --rotate   # replaces an existing endpoint to get a fresh signing secret
 *      pnpm stripe:setup --url https://example.com
 *
 * Secrets are never printed. Railway variables are set with --skip-deploys; the next
 * deploy (or `railway redeploy --service web`) picks them up.
 */
import { spawnSync } from "node:child_process"
import { config } from "dotenv"
import Stripe from "stripe"

config({ path: ".env.local" })
config()

// async_payment_* settle bank payments (ACH and similar), which complete days after Checkout.
const EVENTS = [
  "checkout.session.completed",
  "checkout.session.expired",
  "checkout.session.async_payment_succeeded",
  "checkout.session.async_payment_failed",
  "charge.refunded",
] as const
const DESCRIPTION = "Avelune deposits and payment links (scripts/stripe-setup.ts)"

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name)
  return i >= 0 ? process.argv[i + 1] : undefined
}
const dryRun = process.argv.includes("--dry-run")
const rotate = process.argv.includes("--rotate")
const site = (arg("--url") ?? "https://avelunefamily.com").replace(/\/+$/, "")
const endpointUrl = `${site}/api/stripe/webhook`

function setRailwayVar(key: string, value: string): void {
  const res = spawnSync("railway", ["variable", "set", key, "--stdin", "--service", "web", "--skip-deploys", "--json"], {
    input: value,
    encoding: "utf8",
  })
  if (res.status !== 0) {
    throw new Error(`railway variable set ${key} failed: ${(res.stderr || res.stdout || "").trim().slice(0, 300)}`)
  }
  console.log(`  set ${key} on Railway (service web)`)
}

async function main(): Promise<void> {
  const key = process.env.STRIPE_SECRET_KEY?.trim()
  if (!key) {
    console.error("STRIPE_SECRET_KEY is not set. Add it to .env.local (Stripe dashboard → Developers → API keys).")
    process.exit(1)
  }
  const mode = /_test_/.test(key) ? "test" : /_live_/.test(key) ? "live" : "unknown"
  if (mode === "unknown") {
    console.error("STRIPE_SECRET_KEY does not look like a Stripe secret or restricted key (sk_… / rk_…).")
    process.exit(1)
  }

  const stripe = new Stripe(key)
  const account = await stripe.accounts.retrieveCurrent()
  console.log(`Stripe account ${account.id} (${mode} mode)`)
  console.log(`  name: ${account.settings?.dashboard?.display_name ?? account.business_profile?.name ?? "(not set)"}`)
  console.log(`  country: ${account.country ?? "?"}, default currency: ${account.default_currency ?? "?"}`)
  console.log(
    `  details submitted: ${account.details_submitted}, charges enabled: ${account.charges_enabled}, payouts enabled: ${account.payouts_enabled}`,
  )

  const existing = (await stripe.webhookEndpoints.list({ limit: 100 })).data.find((e) => e.url === endpointUrl)
  let signingSecret: string | undefined

  if (existing && !rotate) {
    if (!dryRun) {
      await stripe.webhookEndpoints.update(existing.id, { enabled_events: [...EVENTS], description: DESCRIPTION })
    }
    console.log(`Webhook endpoint already exists: ${existing.id} → ${endpointUrl}`)
    console.log("  Its signing secret cannot be read back. Re-run with --rotate to replace it and push a new secret.")
  } else if (dryRun) {
    console.log(`Would ${existing ? "replace" : "create"} webhook endpoint → ${endpointUrl}`)
  } else {
    if (existing) await stripe.webhookEndpoints.del(existing.id)
    const created = await stripe.webhookEndpoints.create({
      url: endpointUrl,
      enabled_events: [...EVENTS],
      api_version: Stripe.API_VERSION as Stripe.WebhookEndpointCreateParams.ApiVersion,
      description: DESCRIPTION,
    })
    signingSecret = created.secret
    console.log(`Webhook endpoint ${existing ? "replaced" : "created"}: ${created.id} → ${endpointUrl}`)
    console.log(`  events: ${EVENTS.join(", ")}; API version ${Stripe.API_VERSION}`)
  }

  if (dryRun) {
    console.log("Dry run: nothing pushed to Railway.")
    return
  }
  setRailwayVar("STRIPE_SECRET_KEY", key)
  if (signingSecret) setRailwayVar("STRIPE_WEBHOOK_SECRET", signingSecret)

  console.log("\nNext: set DEPOSIT_AMOUNT_CENTS / DEPOSIT_CURRENCY / DEPOSIT_HOLD_DAYS, then DEPOSITS_ENABLED=true, and redeploy.")
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
