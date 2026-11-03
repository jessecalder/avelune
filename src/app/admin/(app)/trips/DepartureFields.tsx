import { departureStatus, journey, type Departure } from "@/db/schema"
import { NumberField, SelectField, TextArea, TextField, DateField } from "@/components/admin/fields"
import { JOURNEY_LABELS, humanize } from "@/lib/admin/format"

export const JOURNEY_OPTIONS = journey.enumValues.map((v) => ({ value: v, label: JOURNEY_LABELS[v] ?? v }))
export const DEPARTURE_STATUS_OPTIONS = departureStatus.enumValues.map((v) => ({ value: v, label: humanize(v) }))

/** Fields shared by "Add a departure" and "Edit departure". The status select only appears when editing. */
export function DepartureFields({ d }: { d?: Departure }) {
  return (
    <>
      <TextField name="code" label="Code" required defaultValue={d?.code} maxLength={40} placeholder="SSB-2027-07" hint="Capitals, digits and hyphens. Used in emails and vendor messages." />
      <SelectField name="journey" label="Journey" required options={JOURNEY_OPTIONS} defaultValue={d?.journey} blank="Choose" />
      <TextField name="name" label="Name" required defaultValue={d?.name} maxLength={200} placeholder="San Sebastián, July 2027" />
      {d ? <SelectField name="status" label="Status" options={DEPARTURE_STATUS_OPTIONS} defaultValue={d.status} /> : null}
      <DateField name="starts_on" label="First day" required defaultValue={d?.startsOn} />
      <DateField name="ends_on" label="Last day" required defaultValue={d?.endsOn} hint="Must be after the first day." />
      <NumberField name="min_families" label="Minimum families" min={1} max={999} step={1} defaultValue={d?.minFamilies ?? 6} hint="Needed for the departure to run." />
      <NumberField name="max_families" label="Maximum families" min={1} max={999} step={1} defaultValue={d?.maxFamilies ?? 10} />
      <TextField name="currency" label="Currency" defaultValue={d?.currency ?? "usd"} maxLength={3} placeholder="usd" hint="What families are charged in. Three letters." />
      <DateField name="balance_due_on" label="Balance due" defaultValue={d?.balanceDueOn} hint="Default date for the final balance." />
      <TextArea name="price_note" label="Price note" defaultValue={d?.priceNote} rows={2} maxLength={1000} hint="Pricing in words while the model is unsettled. The agreed price lives on each booking." />
      <TextArea name="notes" label="Notes" defaultValue={d?.notes} rows={3} maxLength={4000} hint="No health details or children's names." />
    </>
  )
}
