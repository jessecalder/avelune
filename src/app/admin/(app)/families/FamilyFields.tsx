import { ageBand, familyStatus, type Family, type Traveller } from "@/db/schema"
import { SelectField, TextArea, TextField } from "@/components/admin/fields"
import { AGE_BAND_LABELS, humanize } from "@/lib/admin/format"

export const FAMILY_STATUS_OPTIONS = familyStatus.enumValues.map((v) => ({ value: v, label: humanize(v) }))
export const AGE_BAND_OPTIONS = ageBand.enumValues.map((v) => ({ value: v, label: AGE_BAND_LABELS[v] ?? humanize(v) }))

/** Fields shared by "Add a family" and "Edit family". Rendered inside an ActionForm. */
export function FamilyFields({ f }: { f?: Family }) {
  return (
    <>
      <TextField name="family_name" label="Family name" required defaultValue={f?.familyName} maxLength={200} placeholder="The Ortiz family" />
      <TextField name="primary_contact_name" label="Primary contact" defaultValue={f?.primaryContactName} maxLength={200} hint="The adult who books and pays." />
      <TextField name="email" label="Email" type="email" required defaultValue={f?.email} maxLength={320} hint="One family per email address." />
      <TextField name="phone" label="Phone" type="tel" defaultValue={f?.phone} maxLength={60} hint="Booking-stage detail: ask for it once the privacy page covers it. With country code." />
      <TextField name="home_city" label="Home city" defaultValue={f?.homeCity} maxLength={200} hint="Booking-stage detail. City and state only, no street address." />
      <TextField name="country_code" label="Country" defaultValue={f?.countryCode ?? "US"} maxLength={2} placeholder="US" hint="Two letters." />
      <SelectField name="status" label="Status" options={FAMILY_STATUS_OPTIONS} defaultValue={f?.status ?? "lead"} />
      <TextField name="source" label="Source" defaultValue={f?.source} maxLength={300} placeholder="early_access, or referral: Lopez family" />
      <TextArea name="notes" label="Notes" defaultValue={f?.notes} rows={3} maxLength={4000} hint="Who decides, preferences, tone. Never health details, children's names or passport numbers." />
    </>
  )
}

/**
 * Fields for one person in the household. Names, email and phone are adults only, so a child's
 * form leaves them out (`withPerson` false) and the action then leaves those columns untouched.
 */
export function TravellerFields({ t, withPerson = true }: { t?: Traveller; withPerson?: boolean }) {
  return (
    <>
      <TextField name="label" label="Label" required defaultValue={t?.label} maxLength={200} placeholder="Parent 1" hint="A label, not a name: 'Parent 1', 'Child 1'." />
      <SelectField name="age_band" label="Age band" required options={AGE_BAND_OPTIONS} defaultValue={t?.ageBand} blank={t ? undefined : "Choose"} />
      <TextField name="relationship" label="Relationship" defaultValue={t?.relationship} maxLength={200} placeholder="Mother, grandfather, nanny" />
      {withPerson ? (
        <>
          <TextField name="first_name" label="First name" defaultValue={t?.firstName} maxLength={200} hint="Adults only. Children's names wait for the booking-stage privacy notice." />
          <TextField name="last_name" label="Last name" defaultValue={t?.lastName} maxLength={200} />
          <TextField name="email" label="Email" type="email" defaultValue={t?.email} maxLength={320} hint="Adults only." />
          <TextField name="phone" label="Phone" type="tel" defaultValue={t?.phone} maxLength={60} hint="Adults only." />
        </>
      ) : null}
    </>
  )
}
