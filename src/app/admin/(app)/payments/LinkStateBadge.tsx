import { Badge } from "@/components/admin/kit"
import { LINK_STATE_LABELS, type LinkState } from "@/lib/payments/state"

/** Paid stands out; the dead ends (no link, closed, cancelled, expired, refunded) step back. */
const TONE: Record<LinkState, "plain" | "strong" | "muted"> = {
  no_link: "muted",
  created: "plain",
  sent: "plain",
  opened: "plain",
  checkout_started: "plain",
  processing: "plain",
  paid: "strong",
  refunded: "muted",
  closed: "muted",
  cancelled: "muted",
  expired: "muted",
}

export function LinkStateBadge({ state }: { state: LinkState }) {
  return <Badge tone={TONE[state]}>{LINK_STATE_LABELS[state]}</Badge>
}
