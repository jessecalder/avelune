import { desc, eq, or, sql, type SQL } from "drizzle-orm"
import { getDb } from "@/db/client"
import { interactionKind, interactions } from "@/db/schema"
import { addInteraction, completeFollowUp, deleteInteraction } from "@/lib/admin/actions/interactions"
import { formatDateTime, formatDay, humanize } from "@/lib/admin/format"
import { ActionButton, ActionForm, DateField, DateTimeField, Disclosure, SelectField, TextArea } from "./fields"
import { Badge, Empty, Section } from "./kit"

const CAP = 100

const KIND_OPTIONS = interactionKind.enumValues.map((v) => ({ value: v, label: humanize(v) }))

/**
 * The dated log for a family, vendor or trip, newest first, with open follow-ups flagged.
 * Async server component: the caller has already run requireAdmin(). `path` is the page to
 * refresh after a change; it defaults from the subject, and "/admin/" (refresh every admin page)
 * is the fallback when the panel cannot name its page.
 */
export async function InteractionsPanel({
  familyId,
  vendorId,
  departureId,
  title = "Log",
  path,
}: {
  familyId?: string
  vendorId?: string
  departureId?: string
  title?: string
  path?: string
}) {
  const subjects: SQL[] = []
  if (familyId) subjects.push(eq(interactions.familyId, familyId))
  if (vendorId) subjects.push(eq(interactions.vendorId, vendorId))
  if (departureId) subjects.push(eq(interactions.departureId, departureId))
  if (subjects.length === 0) return null

  const pagePath =
    path ??
    (familyId ? `/admin/families/${familyId}` : vendorId ? `/admin/vendors/${vendorId}` : departureId ? `/admin/trips/${departureId}` : "/admin/")

  // "Today" is Pacific, computed by the database so the render never reads the clock.
  const today = sql`(now() at time zone 'America/Los_Angeles')::date`
  const rows = await getDb()
    .select({
      id: interactions.id,
      kind: interactions.kind,
      occurredAt: interactions.occurredAt,
      summary: interactions.summary,
      followUpOn: interactions.followUpOn,
      followUpDoneAt: interactions.followUpDoneAt,
      overdue: sql<boolean>`${interactions.followUpOn} < ${today} AND ${interactions.followUpDoneAt} IS NULL`,
      dueToday: sql<boolean>`${interactions.followUpOn} = ${today} AND ${interactions.followUpDoneAt} IS NULL`,
    })
    .from(interactions)
    .where(or(...subjects))
    .orderBy(desc(interactions.occurredAt), desc(interactions.createdAt))
    .limit(CAP + 1)

  const capped = rows.length > CAP
  const shown = capped ? rows.slice(0, CAP) : rows

  return (
    <Section title={title} description="Dated notes, calls and emails. Keep health details, children's names and passport numbers out of the text.">
      {shown.length === 0 ? (
        <Empty>Nothing logged yet.</Empty>
      ) : (
        <ul>
          {shown.map((i) => {
            const open = i.followUpOn !== null && i.followUpDoneAt === null
            return (
              <li key={i.id} className="border-b border-mist py-4 first:border-t first:border-ink/30">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <Badge tone="muted">{humanize(i.kind)}</Badge>
                  <span className="text-[0.8125rem] text-stone">{formatDateTime(i.occurredAt)}</span>
                  {i.overdue ? <Badge tone="strong">Overdue</Badge> : null}
                  {i.dueToday ? <Badge>Due</Badge> : null}
                </div>
                <p className="mt-2 max-w-[70ch] whitespace-pre-line text-[0.9375rem] text-ink">{i.summary}</p>
                {i.followUpOn ? (
                  <p className="mt-2 text-[0.8125rem] text-stone">
                    {open ? `Follow up by ${formatDay(i.followUpOn)}` : `Followed up (was due ${formatDay(i.followUpOn)})`}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  {open ? (
                    <ActionButton action={completeFollowUp} hidden={{ id: i.id, path: pagePath }}>
                      Mark done
                    </ActionButton>
                  ) : null}
                  <ActionButton action={deleteInteraction} hidden={{ id: i.id, path: pagePath }} confirm="Delete this entry? This cannot be undone.">
                    Delete
                  </ActionButton>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {capped ? <p className="mt-3 text-[0.8125rem] text-stone">Showing the latest {CAP} entries.</p> : null}

      <div className="mt-6">
        <Disclosure summary="Add an entry">
          <ActionForm
            action={addInteraction}
            resetOnSave
            submitLabel="Add entry"
            hidden={{
              path: pagePath,
              ...(familyId ? { family_id: familyId } : {}),
              ...(vendorId ? { vendor_id: vendorId } : {}),
              ...(departureId ? { departure_id: departureId } : {}),
            }}
          >
            <SelectField name="kind" label="Kind" required options={KIND_OPTIONS} defaultValue="note" />
            <DateTimeField name="occurred_at" label="When" hint="Leave blank for now." />
            <TextArea
              name="summary"
              label="What was said or decided"
              required
              rows={3}
              maxLength={2000}
              hint="A sentence or two, not a transcript. No health details, children's names or passport numbers."
            />
            <DateField name="follow_up_on" label="Follow up by" hint="Optional. Open follow-ups show as due here." />
          </ActionForm>
        </Disclosure>
      </div>
    </Section>
  )
}
