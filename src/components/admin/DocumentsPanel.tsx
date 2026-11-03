import { desc, eq, or, sql, type SQL } from "drizzle-orm"
import { getDb } from "@/db/client"
import { documentKind, documentStatus, documents } from "@/db/schema"
import { addDocument, deleteDocument, updateDocument } from "@/lib/admin/actions/documents"
import { formatDay, humanize } from "@/lib/admin/format"
import { ActionButton, ActionForm, DateField, Disclosure, SelectField, TextArea, TextField } from "./fields"
import { Badge, Empty, LINK_CLASS, Section } from "./kit"

const CAP = 200

const KIND_OPTIONS = documentKind.enumValues.map((v) => ({ value: v, label: humanize(v) }))
const STATUS_OPTIONS = documentStatus.enumValues.map((v) => ({ value: v, label: humanize(v) }))

/**
 * Links (never files) to contracts, quotes, insurance, checks and the like, for one or more owners.
 * Async server component: the caller has already run requireAdmin(). `path` is the page to refresh
 * after a change; it defaults from the owner, and "/admin/" (refresh every admin page) is the
 * fallback for owners whose page this panel cannot name.
 */
export async function DocumentsPanel({
  vendorId,
  departureId,
  departureServiceId,
  bookingId,
  title = "Documents",
  path,
}: {
  vendorId?: string
  departureId?: string
  departureServiceId?: string
  bookingId?: string
  title?: string
  path?: string
}) {
  const owners: SQL[] = []
  if (vendorId) owners.push(eq(documents.vendorId, vendorId))
  if (departureId) owners.push(eq(documents.departureId, departureId))
  if (departureServiceId) owners.push(eq(documents.departureServiceId, departureServiceId))
  if (bookingId) owners.push(eq(documents.bookingId, bookingId))
  if (owners.length === 0) return null

  const pagePath = path ?? (vendorId ? `/admin/vendors/${vendorId}` : departureId ? `/admin/trips/${departureId}` : "/admin/")

  // "Today" is Pacific, computed by the database so the render never reads the clock.
  const today = sql`(now() at time zone 'America/Los_Angeles')::date`
  const rows = await getDb()
    .select({
      id: documents.id,
      title: documents.title,
      kind: documents.kind,
      status: documents.status,
      url: documents.url,
      datedOn: documents.datedOn,
      expiresOn: documents.expiresOn,
      notes: documents.notes,
      expired: sql<boolean>`${documents.expiresOn} < ${today}`,
      expiresSoon: sql<boolean>`${documents.expiresOn} >= ${today} AND ${documents.expiresOn} <= ${today} + 30`,
    })
    .from(documents)
    .where(or(...owners))
    .orderBy(sql`${documents.expiresOn} asc nulls last`, desc(documents.createdAt))
    .limit(CAP + 1)

  const capped = rows.length > CAP
  const shown = capped ? rows.slice(0, CAP) : rows

  return (
    <Section title={title} description="Links only. The files stay in Drive, Dropbox or DocuSign.">
      {shown.length === 0 ? (
        <Empty>No documents yet.</Empty>
      ) : (
        <ul>
          {shown.map((d) => {
            const live = d.status !== "void"
            return (
              <li key={d.id} className="border-b border-mist py-4 first:border-t first:border-ink/30">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <Badge tone="muted">{humanize(d.kind)}</Badge>
                  <span className="text-[0.9375rem] text-ink">
                    {d.url ? (
                      <a href={d.url} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
                        {d.title}
                      </a>
                    ) : (
                      d.title
                    )}
                  </span>
                  <Badge tone={d.status === "on_file" ? "strong" : "plain"}>{humanize(d.status)}</Badge>
                  {live && d.expired ? <Badge tone="strong">Expired</Badge> : null}
                  {live && d.expiresSoon ? <Badge>Expires soon</Badge> : null}
                </div>
                <p className="mt-2 text-[0.8125rem] text-stone">
                  Dated {formatDay(d.datedOn)} · Expires {formatDay(d.expiresOn)}
                  {d.url ? null : " · No link yet"}
                </p>
                {d.notes ? <p className="mt-2 max-w-[70ch] whitespace-pre-line text-[0.875rem] text-ink-soft">{d.notes}</p> : null}
                <div className="mt-3 flex flex-wrap items-start gap-x-8 gap-y-2">
                  <div className="min-w-0 flex-1">
                    <Disclosure summary="Edit">
                      <ActionForm action={updateDocument} hidden={{ id: d.id, path: pagePath }} submitLabel="Save document">
                        <DocumentFields d={d} />
                      </ActionForm>
                    </Disclosure>
                  </div>
                  <div className="pt-4">
                    <ActionButton action={deleteDocument} hidden={{ id: d.id, path: pagePath }} confirm={`Delete "${d.title}"? The link is removed from here; the file itself is untouched.`}>
                      Delete
                    </ActionButton>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {capped ? <p className="mt-3 text-[0.8125rem] text-stone">Showing the first {CAP} documents.</p> : null}

      <div className="mt-6">
        <Disclosure summary="Add a document">
          <ActionForm
            action={addDocument}
            resetOnSave
            submitLabel="Add document"
            hidden={{
              path: pagePath,
              ...(vendorId ? { vendor_id: vendorId } : {}),
              ...(departureId ? { departure_id: departureId } : {}),
              ...(departureServiceId ? { departure_service_id: departureServiceId } : {}),
              ...(bookingId ? { booking_id: bookingId } : {}),
            }}
          >
            <DocumentFields />
          </ActionForm>
        </Disclosure>
      </div>
    </Section>
  )
}

function DocumentFields({
  d,
}: {
  d?: { title: string; kind: string; status: string; url: string | null; datedOn: string | null; expiresOn: string | null; notes: string | null }
}) {
  return (
    <>
      <TextField name="title" label="Title" required defaultValue={d?.title} wide maxLength={300} placeholder="Hotel group contract 2027" />
      <SelectField name="kind" label="Kind" required options={KIND_OPTIONS} defaultValue={d?.kind ?? "other"} />
      <SelectField name="status" label="Status" required options={STATUS_OPTIONS} defaultValue={d?.status ?? "requested"} />
      <TextField
        name="url"
        label="Link"
        type="url"
        defaultValue={d?.url}
        wide
        placeholder="https://"
        hint="Documents are links only: paste the https:// link from Google Drive, Dropbox, DocuSign or similar. Required once the status is sent or on file. Never link a medical form or a passport scan."
      />
      <DateField name="dated_on" label="Dated" defaultValue={d?.datedOn} />
      <DateField name="expires_on" label="Expires" defaultValue={d?.expiresOn} />
      <TextArea
        name="notes"
        label="Notes"
        defaultValue={d?.notes}
        rows={2}
        maxLength={2000}
        hint="Working notes only. Never the content of a background check."
      />
    </>
  )
}
