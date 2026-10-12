function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

/** Only a plain first name reaches the greeting; anything else is dropped so the
 * email can never carry attacker-supplied text. */
function salutation(name?: string): string {
  const first = name?.trim().split(/\s+/)[0] ?? ""
  return /^[\p{L}\p{M}\u2019'-]{1,30}$/u.test(first) ? `Dear ${first},` : "Hello,"
}

const PREHEADER =
  "Summer 2027. Two extraordinary places. A handful of founding families."

const PARAGRAPHS = [
  "Thank you for joining the Avelune early list.",
  "Avelune plans summer journeys for a small number of families travelling together: San Sebastián on the Basque coast, and Antigua in the Guatemalan highlands. Every day is arranged in advance, with something real for children of every age and room for the adults to breathe.",
  "We are shaping the first departures now. You will hear from us before anyone else, with dates, places and the details that matter, and an invitation to hold a place before the doors open more widely.",
  "If there is anything you would like us to know about your family, simply reply to this email. A person reads every reply.",
]

export const welcomeEmail = {
  subject: "You’re on the Avelune early list",
  preheader: PREHEADER,
  text(name?: string): string {
    const greeting = salutation(name)
    return [
      greeting,
      ...PARAGRAPHS,
      "With warm regards,\nThe Avelune team",
      "Reply to this email to be removed.",
    ].join("\n\n")
  },
  html(name?: string): string {
    const greeting = esc(salutation(name))
    const body = PARAGRAPHS.map(
      (p) =>
        `<p style="margin:0 0 18px;font-size:16px;line-height:1.7;">${esc(p)}</p>`,
    ).join("\n")
    const font =
      "-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif"
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(welcomeEmail.subject)}</title>
</head>
<body style="margin:0;padding:0;background:#F6F1E8;color:#14181F;font-family:${font};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(PREHEADER)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F6F1E8;">
<tr><td align="center" style="padding:40px 16px;">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
<tr><td style="padding:0 0 28px;font-size:13px;letter-spacing:0.28em;text-transform:uppercase;color:#14181F;">Avelune</td></tr>
<tr><td style="font-family:${font};color:#14181F;">
<p style="margin:0 0 18px;font-size:16px;line-height:1.7;">${greeting}</p>
${body}
<p style="margin:28px 0 0;font-size:16px;line-height:1.7;">With warm regards,<br>The Avelune team</p>
</td></tr>
<tr><td style="padding:40px 0 0;font-size:12px;line-height:1.6;color:#5b606a;">Reply to this email to be removed.</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
  },
}
