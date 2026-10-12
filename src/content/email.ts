function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
}

/** Only a plain first name reaches the greeting; anything else is dropped so the
 * email can never carry attacker-supplied text. */
function salutation(name?: string): string {
  const first = name?.trim().split(/\s+/)[0] ?? ""
  return /^[\p{L}\p{M}’'-]{1,30}$/u.test(first) ? `Dear ${first},` : "Hello,"
}

const PREHEADER = "Summer 2027. San Sebastián or Antigua. One email when the itineraries are ready."

const PARAGRAPHS = [
  "Thank you. You are on the early-access list for Avelune's first summer journeys.",
  "Here is what happens next. We are finishing two ten-day itineraries for summer 2027: the Basque coast around San Sebastián in July, and the highlands around Antigua, Guatemala, in August. Each takes six to ten families, with hosts for every age from three to seventeen, and every house, guide, boat and table booked before you land. Parents get real time off. Every evening ends at one long table.",
  "As a founding family you will see the full itineraries, the house, the dates and the price six weeks before anyone else, with a fourteen-day window to hold a place on a fully refundable deposit. Nothing is charged until you say so.",
  "If you have thirty seconds, reply with your children's ages and which journey pulls harder. It changes what we build.",
  "You will hear from us once, when the itineraries are ready. Until then, nothing. Reply to this email any time; it is read by a person.",
]

const SIGNOFF = "Jesse\nAvelune"
const PRONUNCIATION = "ah-veh-LOON. A bird, a moon, a summer."
const FOOTER = "You are receiving this because you requested early access to Avelune. Not for you? Reply with the word remove and you are gone."

export const welcomeEmail = {
  subject: "You are on the Avelune list",
  preheader: PREHEADER,
  text(name?: string): string {
    return [salutation(name), ...PARAGRAPHS, SIGNOFF, PRONUNCIATION, FOOTER].join("\n\n")
  },
  html(name?: string): string {
    const font = "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif"
    const p = (t: string) => `<p style="margin:0 0 18px;font-size:16px;line-height:1.7;">${esc(t)}</p>`
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(welcomeEmail.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#F3EDE2;color:#14181F;font-family:${font};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(PREHEADER)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F3EDE2;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
<tr><td style="padding:0 0 28px;font-size:13px;letter-spacing:0.28em;text-transform:uppercase;color:#14181F;">Avelune</td></tr>
<tr><td style="font-family:${font};color:#14181F;">
${p(salutation(name))}
${PARAGRAPHS.map(p).join("\n")}
<p style="margin:28px 0 0;font-size:16px;line-height:1.7;">Jesse<br>Avelune</p>
<p style="margin:18px 0 0;font-size:14px;line-height:1.6;color:#6B655B;">${esc(PRONUNCIATION)}</p>
</td></tr>
<tr><td style="padding:40px 0 0;font-size:12px;line-height:1.6;color:#6B655B;">${esc(FOOTER)}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
  },
}
