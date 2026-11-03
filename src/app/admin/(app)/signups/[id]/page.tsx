import { eq } from "drizzle-orm"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ActionButton, ActionForm, TextField } from "@/components/admin/fields"
import { Badge, Facts, LINK_CLASS, Notice, PageHeader, Section } from "@/components/admin/kit"
import { getDb } from "@/db/client"
import { families, signups } from "@/db/schema"
import { createFamilyFromSignup, deleteSignup, markSignupUnsubscribed } from "@/lib/admin/actions/signups"
import { requireAdmin } from "@/lib/admin/auth"
import { JOURNEY_LABELS, formatDateTime, humanize } from "@/lib/admin/format"
import { isUuid } from "@/lib/admin/forms"

export const metadata: Metadata = { title: "Signup" }

/** "The Ortiz family" from a full name (last word), else from the email's local part. */
function suggestedFamilyName(name: string | null, email: string): string {
  const base = name?.trim().split(/\s+/).at(-1) || email.split("@")[0]?.replace(/[._+-]+/g, " ").trim()
  if (!base) return "New family"
  return `The ${base.charAt(0).toUpperCase()}${base.slice(1)} family`
}

export default async function SignupPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  if (!isUuid(id)) notFound()

  // confirm_token, ip_hash and user_agent are deliberately not selected.
  const [signup] = await getDb()
    .select({
      id: signups.id,
      email: signups.email,
      name: signups.name,
      childrenCount: signups.childrenCount,
      childrenAges: signups.childrenAges,
      destinations: signups.destinations,
      notes: signups.notes,
      source: signups.source,
      referrer: signups.referrer,
      utm: signups.utm,
      landingPath: signups.landingPath,
      status: signups.status,
      consentAt: signups.consentAt,
      consentVersion: signups.consentVersion,
      confirmedAt: signups.confirmedAt,
      createdAt: signups.createdAt,
      updatedAt: signups.updatedAt,
    })
    .from(signups)
    .where(eq(signups.id, id))
    .limit(1)
  if (!signup) notFound()

  const [family] = await getDb()
    .select({ id: families.id, familyName: families.familyName })
    .from(families)
    .where(eq(families.signupId, id))
    .limit(1)

  const utmLines = signup.utm ? Object.entries(signup.utm) : []

  return (
    <>
      <PageHeader
        back={{ href: "/admin/signups", label: "Early access" }}
        eyebrow="Early-access signup"
        title={signup.name ?? signup.email}
        description={
          <span className="flex flex-wrap items-center gap-3">
            <span className="break-all">{signup.email}</span>
            <Badge tone={signup.status === "confirmed" ? "strong" : signup.status === "unsubscribed" ? "muted" : "plain"}>
              {humanize(signup.status)}
            </Badge>
          </span>
        }
      />

      <Section title="Details">
        <Facts
          items={[
            { label: "Email", value: <span className="break-all">{signup.email}</span> },
            { label: "Name", value: signup.name ?? "—" },
            { label: "Status", value: humanize(signup.status) },
            { label: "Children", value: signup.childrenCount ?? "—" },
            { label: "Children's ages", value: signup.childrenAges ?? "—" },
            {
              label: "Destinations",
              value: signup.destinations?.length ? signup.destinations.map((d) => JOURNEY_LABELS[d] ?? humanize(d)).join(", ") : "—",
            },
            { label: "Joined", value: formatDateTime(signup.createdAt) },
            { label: "Source", value: signup.source ?? "—" },
            { label: "Landing page", value: signup.landingPath ?? "—" },
            { label: "Referrer", value: signup.referrer ? <span className="break-all">{signup.referrer}</span> : "—" },
            {
              label: "Campaign (UTM)",
              value:
                utmLines.length > 0 ? (
                  <ul>
                    {utmLines.map(([k, v]) => (
                      <li key={k} className="break-all">
                        {k}: {v}
                      </li>
                    ))}
                  </ul>
                ) : (
                  "—"
                ),
            },
            { label: "Consent", value: `${signup.consentVersion} · ${formatDateTime(signup.consentAt)}` },
            { label: "Confirmed", value: formatDateTime(signup.confirmedAt) },
            { label: "Last changed", value: formatDateTime(signup.updatedAt) },
            { label: "Notes", value: signup.notes ? <span className="whitespace-pre-wrap">{signup.notes}</span> : "—" },
          ]}
        />
      </Section>

      <Section title="Family">
        {family ? (
          <p className="text-[0.9375rem] text-ink">
            This signup became{" "}
            <Link href={`/admin/families/${family.id}`} className={LINK_CLASS}>
              {family.familyName}
            </Link>
            .
          </p>
        ) : (
          <>
            <p className="mb-5 max-w-[70ch] text-[0.9375rem] text-ink-soft">
              Starting a family copies the email and notes into a new family record, status lead. The signup stays as the consent record.
            </p>
            <ActionForm action={createFamilyFromSignup} submitLabel="Create a family from this signup" hidden={{ signup_id: signup.id }}>
              <TextField name="family_name" label="Family name" required defaultValue={suggestedFamilyName(signup.name, signup.email)} maxLength={200} />
              <TextField name="primary_contact_name" label="Primary contact" defaultValue={signup.name} maxLength={200} hint="An adult's name. Children's names wait for the booking-stage privacy notice." />
            </ActionForm>
          </>
        )}
      </Section>

      <Section title="Manage">
        <div className="flex flex-wrap items-center gap-4">
          {signup.status !== "unsubscribed" ? (
            <ActionButton action={markSignupUnsubscribed} hidden={{ id: signup.id }} confirm="Mark this person as unsubscribed? They will no longer be written to as part of the early-access list.">
              Mark unsubscribed
            </ActionButton>
          ) : null}
          <ActionButton
            action={deleteSignup}
            hidden={{ id: signup.id }}
            confirm="Delete this signup? This permanently removes the person's early-access record, including their consent record. A linked family keeps its own copy of the email. This cannot be undone."
          >
            Delete this signup
          </ActionButton>
        </div>
        <div className="mt-5 max-w-[70ch]">
          <Notice>Deleting is for erasure requests. If the person only wants no more email, mark them unsubscribed instead so they are not added again by mistake.</Notice>
        </div>
      </Section>
    </>
  )
}
