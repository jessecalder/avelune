import { paymentKind, paymentMethod, paymentStatus, type Payment } from "@/db/schema"
import { DateField, DateTimeField, MoneyField, SelectField, TextArea, TextField } from "@/components/admin/fields"
import { centsToInput, humanize, toPacificInput } from "@/lib/admin/format"

const KIND_OPTIONS = paymentKind.enumValues.map((v) => ({ value: v, label: humanize(v) }))
const STATUS_OPTIONS = paymentStatus.enumValues.map((v) => ({ value: v, label: humanize(v) }))
const METHOD_OPTIONS = paymentMethod.enumValues.map((v) => ({ value: v, label: humanize(v) }))

/** Fields shared by "Add a payment" and "Edit". Stripe ids and the linked deposit are filled by Stripe's webhook, not by hand. */
export function PaymentFields({ p, bookingCurrency }: { p?: Payment; bookingCurrency: string }) {
  return (
    <>
      <SelectField name="kind" label="Kind" required options={KIND_OPTIONS} defaultValue={p?.kind} blank="Choose" />
      <TextField name="label" label="Label" defaultValue={p?.label} maxLength={200} placeholder="Second instalment" />
      <MoneyField name="amount" label="Amount" required defaultValue={centsToInput(p?.amountCents)} hint="More than zero." />
      <TextField name="currency" label="Currency" defaultValue={p?.currency ?? bookingCurrency} maxLength={3} hint="Normally the booking's currency. Another currency is listed but not added into the totals." />
      <DateField name="due_on" label="Due" required defaultValue={p?.dueOn} hint="For a payment taken on the spot, the day it was taken." />
      <SelectField name="status" label="Status" options={STATUS_OPTIONS} defaultValue={p?.status ?? "scheduled"} />
      <SelectField name="method" label="Method" options={METHOD_OPTIONS} defaultValue={p?.method ?? "stripe"} />
      <DateTimeField name="paid_at" label="Paid at" defaultValue={toPacificInput(p?.paidAt)} hint="Required when the status is paid or refunded." />
      <MoneyField name="amount_refunded" label="Amount refunded" defaultValue={centsToInput(p?.amountRefundedCents ?? 0)} hint="A partial refund keeps the status paid. Refunded means the whole amount." />
      <TextArea name="notes" label="Notes" defaultValue={p?.notes} rows={2} maxLength={2000} />
    </>
  )
}
