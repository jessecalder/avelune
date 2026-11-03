import { journey, vendorCategory, vendorStatus, type Vendor, type VendorContact } from "@/db/schema"
import { CheckboxField, NumberField, SelectField, TextArea, TextField } from "@/components/admin/fields"
import { JOURNEY_LABELS, humanize } from "@/lib/admin/format"

export const CATEGORY_OPTIONS = vendorCategory.enumValues.map((v) => ({ value: v, label: humanize(v) }))
export const STATUS_OPTIONS = vendorStatus.enumValues.map((v) => ({ value: v, label: humanize(v) }))
export const JOURNEY_OPTIONS = journey.enumValues.map((v) => ({ value: v, label: JOURNEY_LABELS[v] ?? v }))

/** Fields shared by "Add a vendor" and "Edit vendor". Rendered inside an ActionForm. */
export function VendorFields({ v }: { v?: Vendor }) {
  return (
    <>
      <TextField name="name" label="Name" required defaultValue={v?.name} maxLength={200} hint="Trading name, or the person's full name for a freelancer." />
      <SelectField name="category" label="Category" required options={CATEGORY_OPTIONS} defaultValue={v?.category} blank="Choose" />
      <CheckboxField name="is_individual" label="Private individual" defaultChecked={v?.isIndividual} hint="Freelance hosts and guides. Their details are personal data." />
      <SelectField name="status" label="Status" options={STATUS_OPTIONS} defaultValue={v?.status ?? "prospect"} />
      <SelectField name="journey" label="Destination" options={JOURNEY_OPTIONS} defaultValue={v?.journey} blank="Both / any" />
      <TextField name="city" label="City" defaultValue={v?.city} maxLength={200} />
      <TextField name="country_code" label="Country code" defaultValue={v?.countryCode} maxLength={2} placeholder="ES" hint="Two letters, e.g. ES or GT." />
      <TextField name="website" label="Website" type="text" defaultValue={v?.website} maxLength={500} placeholder="https://" />
      <TextField name="email" label="Email" type="email" defaultValue={v?.email} maxLength={320} />
      <TextField name="phone" label="Phone" type="tel" defaultValue={v?.phone} maxLength={60} hint="With country code, e.g. +34 943 000 000." />
      <TextField name="default_currency" label="Quotes in" defaultValue={v?.defaultCurrency} maxLength={3} placeholder="eur" hint="Three letters: eur, gtq, usd." />
      <NumberField name="rating" label="Rating (1 to 5)" min={1} max={5} step={1} defaultValue={v?.rating} />
      <TextArea name="payment_terms" label="Payment terms" defaultValue={v?.paymentTerms} rows={2} maxLength={1000} hint="e.g. 30% on signing, balance 30 days before arrival." />
      <TextArea name="notes" label="Notes" defaultValue={v?.notes} rows={3} maxLength={4000} hint="Quality notes. No health details or children's names." />
    </>
  )
}

/** Fields for one vendor contact. */
export function ContactFields({ c }: { c?: VendorContact }) {
  return (
    <>
      <TextField name="name" label="Name" required defaultValue={c?.name} maxLength={200} />
      <TextField name="role" label="Role" defaultValue={c?.role} maxLength={200} placeholder="Reservations" />
      <TextField name="email" label="Email" type="email" defaultValue={c?.email} maxLength={320} />
      <TextField name="phone" label="Phone" type="tel" defaultValue={c?.phone} maxLength={60} />
      <TextField name="language" label="Language" defaultValue={c?.language} maxLength={60} placeholder="es" />
      <CheckboxField name="prefers_whatsapp" label="Prefers WhatsApp" defaultChecked={c?.prefersWhatsapp} />
      <CheckboxField name="is_primary" label="Primary contact" defaultChecked={c?.isPrimary} hint="One per vendor." />
      <TextArea name="notes" label="Notes" defaultValue={c?.notes} rows={2} maxLength={2000} hint="e.g. best hours to call." />
    </>
  )
}
