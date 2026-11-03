import { bookingStatus, type Booking } from "@/db/schema"
import { DateTimeField, MoneyField, SelectField, TextArea, TextField } from "@/components/admin/fields"
import { Notice } from "@/components/admin/kit"
import { centsToInput, humanize, toPacificInput } from "@/lib/admin/format"

const STATUS_OPTIONS = bookingStatus.enumValues.map((v) => ({ value: v, label: humanize(v) }))

/** Fields of "Edit booking". The reference (ref) is filled by the database and is not editable. */
export function BookingFields({ b }: { b: Booking }) {
  return (
    <>
      <SelectField name="status" label="Status" options={STATUS_OPTIONS} defaultValue={b.status} hint="Confirming stamps the confirmed date. Cancelling stamps the cancelled date and needs a reason." />
      <MoneyField name="total_price" label="Total price" defaultValue={centsToInput(b.totalPriceCents)} hint="After any founding-family discount. Blank until agreed." />
      <TextField name="currency" label="Currency" required defaultValue={b.currency} maxLength={3} placeholder="usd" hint="Normally the departure's currency." />
      <DateTimeField name="held_until" label="Held until" defaultValue={toPacificInput(b.heldUntil)} />
      <TextField name="terms_version" label="Terms version" defaultValue={b.termsVersion} maxLength={100} placeholder="2027-01" />
      <DateTimeField name="terms_accepted_at" label="Terms accepted" defaultValue={toPacificInput(b.termsAcceptedAt)} />
      <TextField name="privacy_version" label="Privacy notice version" defaultValue={b.privacyVersion} maxLength={100} />
      <DateTimeField name="privacy_accepted_at" label="Privacy accepted" defaultValue={toPacificInput(b.privacyAcceptedAt)} />
      <div className="sm:col-span-2">
        <Notice>
          Flight and train details are booking-stage personal data. Record them only once the booking-stage privacy notice is live and its version is set above.
        </Notice>
      </div>
      <DateTimeField name="arrives_at" label="Arrives" defaultValue={toPacificInput(b.arrivesAt)} hint="Entered as Pacific time." />
      <TextField name="arrival_details" label="Arrival details" defaultValue={b.arrivalDetails} maxLength={1000} placeholder="IB 3456 into BIO" />
      <DateTimeField name="departs_at" label="Departs" defaultValue={toPacificInput(b.departsAt)} />
      <TextField name="departure_details" label="Departure details" defaultValue={b.departureDetails} maxLength={1000} />
      <TextArea name="notes" label="Notes" defaultValue={b.notes} rows={3} maxLength={4000} hint="Rooming wishes, discount reason. No health details or children's names." />
      <TextArea name="cancellation_reason" label="Cancellation reason" defaultValue={b.cancellationReason} rows={2} maxLength={2000} hint="Required when the status is cancelled." />
    </>
  )
}
