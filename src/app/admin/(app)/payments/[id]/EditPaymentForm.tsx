"use client"

import { useRouter } from "next/navigation"
import type { ReactNode } from "react"
import { ActionForm } from "@/components/admin/fields"
import { updatePayment } from "@/lib/admin/actions/payments"
import type { FormState } from "@/lib/admin/forms"

/**
 * The existing "Edit payment" form on the payment's own page. updatePayment refreshes the
 * booking and trip pages but not this one, so a successful save refreshes the page here.
 */
export function EditPaymentForm({ paymentId, bookingId, children }: { paymentId: string; bookingId: string; children: ReactNode }) {
  const router = useRouter()
  async function save(prev: FormState, formData: FormData): Promise<FormState> {
    const next = await updatePayment(prev, formData)
    if (next.status === "saved") router.refresh()
    return next
  }
  return (
    <ActionForm action={save} hidden={{ id: paymentId, booking_id: bookingId }} submitLabel="Save payment">
      {children}
    </ActionForm>
  )
}
