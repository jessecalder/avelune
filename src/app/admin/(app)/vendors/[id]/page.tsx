import { asc, desc, eq, sql } from "drizzle-orm"
import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ActionButton, ActionForm, Disclosure } from "@/components/admin/fields"
import { DocumentsPanel } from "@/components/admin/DocumentsPanel"
import { InteractionsPanel } from "@/components/admin/InteractionsPanel"
import { Badge, Empty, Facts, LINK_CLASS, Notice, PageHeader, Section, Table } from "@/components/admin/kit"
import { getDb } from "@/db/client"
import { departureServices, departures, vendorContacts, vendors } from "@/db/schema"
import { addContact, deleteVendor, removeContact, updateContact, updateVendor } from "@/lib/admin/actions/vendors"
import { requireAdmin } from "@/lib/admin/auth"
import { JOURNEY_LABELS, formatDateTime, formatDay, formatMoney, formatRange, humanize } from "@/lib/admin/format"
import { isUuid } from "@/lib/admin/forms"
import { ContactFields, VendorFields } from "../VendorFields"

export const metadata: Metadata = { title: "Vendor" }


const LINE_CAP = 200

/** Stored values can come from a spreadsheet tool, so only real web addresses become links. */
function safeHref(url: string | null): string | null {
  return url && /^https?:\/\//i.test(url) ? url : null
}

export default async function VendorPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  if (!isUuid(id)) notFound()

  const db = getDb()
  const [vendor] = await db.select().from(vendors).where(eq(vendors.id, id)).limit(1)
  if (!vendor) notFound()

  const [contacts, lines] = await Promise.all([
    db
      .select()
      .from(vendorContacts)
      .where(eq(vendorContacts.vendorId, id))
      .orderBy(desc(vendorContacts.isPrimary), asc(vendorContacts.name)),
    db
      .select({
        id: departureServices.id,
        departureId: departureServices.departureId,
        departureCode: departures.code,
        title: departureServices.title,
        startsOn: departureServices.startsOn,
        endsOn: departureServices.endsOn,
        status: departureServices.status,
        totalCents: departureServices.totalCents,
        paidCents: departureServices.paidCents,
        currency: departureServices.currency,
        balanceDueOn: departureServices.balanceDueOn,
      })
      .from(departureServices)
      .innerJoin(departures, eq(departures.id, departureServices.departureId))
      .where(eq(departureServices.vendorId, id))
      .orderBy(sql`${departureServices.startsOn} asc nulls last`, asc(departureServices.title))
      .limit(LINE_CAP + 1),
  ])
  const linesCapped = lines.length > LINE_CAP
  const shownLines = linesCapped ? lines.slice(0, LINE_CAP) : lines

  const website = safeHref(vendor.website)
  const pagePath = `/admin/vendors/${id}`

  return (
    <>
      <PageHeader
        back={{ href: "/admin/vendors", label: "Vendors" }}
        eyebrow={`${humanize(vendor.category)} · ${humanize(vendor.status)}`}
        title={vendor.name}
        actions={
          <ActionButton
            action={deleteVendor}
            hidden={{ id }}
            confirm={`Delete ${vendor.name}? Its contacts and conversation log are deleted with it. This cannot be undone.`}
          >
            Delete vendor
          </ActionButton>
        }
      />

      <section className="mt-10 space-y-6">
        {vendor.isIndividual ? (
          <Notice>
            This vendor is a private individual, so these details are personal data. Delete the record two years after their last supplier line, keeping only the name where cost
            records need it.
          </Notice>
        ) : null}
        <Facts
          items={[
            { label: "Category", value: humanize(vendor.category) },
            { label: "Status", value: humanize(vendor.status) },
            { label: "Type", value: vendor.isIndividual ? <Badge tone="muted">Individual</Badge> : "Business" },
            { label: "Destination", value: vendor.journey ? (JOURNEY_LABELS[vendor.journey] ?? vendor.journey) : "Both / any" },
            { label: "Place", value: [vendor.city, vendor.countryCode].filter(Boolean).join(" · ") || "—" },
            {
              label: "Website",
              value: website ? (
                <a href={website} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
                  {vendor.website}
                </a>
              ) : (
                (vendor.website ?? "—")
              ),
            },
            {
              label: "Email",
              value: vendor.email ? (
                <a href={`mailto:${vendor.email}`} className={LINK_CLASS}>
                  {vendor.email}
                </a>
              ) : (
                "—"
              ),
            },
            { label: "Phone", value: vendor.phone ?? "—" },
            { label: "Quotes in", value: vendor.defaultCurrency ? vendor.defaultCurrency.toUpperCase() : "—" },
            { label: "Rating", value: vendor.rating ? `★ ${vendor.rating} of 5` : "—" },
            { label: "Payment terms", value: vendor.paymentTerms ? <span className="whitespace-pre-line">{vendor.paymentTerms}</span> : "—" },
            { label: "Added", value: formatDateTime(vendor.createdAt) },
            { label: "Notes", value: vendor.notes ? <span className="whitespace-pre-line">{vendor.notes}</span> : "—" },
          ]}
        />
        <Disclosure summary="Edit vendor">
          <ActionForm action={updateVendor} hidden={{ id }} submitLabel="Save vendor">
            <VendorFields v={vendor} />
          </ActionForm>
        </Disclosure>
      </section>

      <Section title="Contacts" description="The people to call. One can be marked primary.">
        <Table
          empty="No contacts yet."
          columns={["Name", "Role", "Email", "Phone", "WhatsApp", "Language", "Primary", "Notes"]}
          rows={contacts.map((c) => [
            c.name,
            c.role ?? "—",
            c.email ? (
              <a key="e" href={`mailto:${c.email}`} className={LINK_CLASS}>
                {c.email}
              </a>
            ) : (
              "—"
            ),
            c.phone ?? "—",
            c.prefersWhatsapp ? <Badge key="w">WhatsApp</Badge> : "—",
            c.language ?? "—",
            c.isPrimary ? <Badge key="p" tone="strong">Primary</Badge> : "—",
            c.notes ? <span key="n" className="whitespace-pre-line">{c.notes}</span> : "—",
          ])}
        />
        {contacts.length > 0 ? (
          <div className="mt-6">
            {contacts.map((c) => (
              <div key={c.id} className="flex flex-wrap items-start justify-between gap-x-6">
                <div className="min-w-0 flex-1 basis-[20rem]">
                  <Disclosure summary={`Edit ${c.name}`}>
                    <ActionForm action={updateContact} hidden={{ id: c.id, vendor_id: id }} submitLabel="Save contact">
                      <ContactFields c={c} />
                    </ActionForm>
                  </Disclosure>
                </div>
                <div className="pt-3">
                  <ActionButton action={removeContact} hidden={{ id: c.id, vendor_id: id }} confirm={`Remove ${c.name} from this vendor?`}>
                    Remove
                  </ActionButton>
                </div>
              </div>
            ))}
          </div>
        ) : null}
        <div className="mt-6">
          <Disclosure summary="Add a contact">
            <ActionForm action={addContact} hidden={{ vendor_id: id }} resetOnSave submitLabel="Add contact">
              <ContactFields />
            </ActionForm>
          </Disclosure>
        </div>
      </Section>

      <Section title="Supplier lines" description="Lines are added and edited on the trip's supplier sheet.">
        {shownLines.length === 0 ? (
          <Empty>No supplier lines use this vendor yet.</Empty>
        ) : (
          <Table
            columns={["Trip", "Line", "Dates", "Status", "Total", "Paid", "Balance due"]}
            rows={shownLines.map((l) => [
              <Link key="t" href={`/admin/trips/${l.departureId}`} className={LINK_CLASS}>
                {l.departureCode}
              </Link>,
              l.title,
              formatRange(l.startsOn, l.endsOn),
              <Badge key="s" tone={l.status === "confirmed" ? "strong" : l.status === "declined" || l.status === "cancelled" ? "muted" : "plain"}>
                {humanize(l.status)}
              </Badge>,
              <span key="tot" className="tabular-nums">
                {formatMoney(l.totalCents, l.currency)}
              </span>,
              <span key="paid" className="tabular-nums">
                {formatMoney(l.paidCents, l.currency)}
              </span>,
              formatDay(l.balanceDueOn),
            ])}
          />
        )}
        {linesCapped ? <p className="mt-3 text-[0.8125rem] text-stone">Showing the first {LINE_CAP} lines.</p> : null}
      </Section>

      <DocumentsPanel vendorId={id} path={pagePath} title="Contracts, insurance and checks" />
      <InteractionsPanel vendorId={id} path={pagePath} title="Conversations" />
    </>
  )
}
