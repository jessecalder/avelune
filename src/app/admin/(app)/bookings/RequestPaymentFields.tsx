import { DateField, MoneyField, SelectField, TextField } from "@/components/admin/fields"
import { paymentKind, type Payment } from "@/db/schema"
import { centsToInput, humanize } from "@/lib/admin/format"

const KIND_OPTIONS = paymentKind.enumValues.map((v) => ({ value: v, label: humanize(v) }))

/**
 * Fields for "Request a payment" on a booking. The payment is in the booking's currency and goes
 * out as invoiced by Stripe link; `suggestions` are prefilled hints, never applied silently.
 */
export function RequestPaymentFields({
  defaultKind,
  defaultAmountCents,
  defaultDueOn,
  suggestions,
}: {
  defaultKind: Payment["kind"]
  defaultAmountCents: number | null
  defaultDueOn: string
  /** Display text such as "Deposit $1,000.00" or "Balance outstanding $4,000.00". */
  suggestions: string[]
}) {
  return (
    <>
      <SelectField name="kind" label="Kind" required options={KIND_OPTIONS} defaultValue={defaultKind} />
      <MoneyField
        name="amount"
        label="Amount"
        required
        defaultValue={centsToInput(defaultAmountCents)}
        hint={suggestions.length > 0 ? `Suggested: ${suggestions.join(" · ")}.` : "More than zero. Stripe takes at least 0.50."}
      />
      <TextField name="label" label="Label" maxLength={200} placeholder="Second instalment" hint="Optional. For an extra payment it is the title the family sees." />
      <DateField name="due_on" label="Due" required defaultValue={defaultDueOn} hint="Two weeks from today unless you change it." />
      <DateField name="expires_on" label="Link works until" hint="Optional. Pacific time, through the end of that day. Blank means no expiry." />
    </>
  )
}
