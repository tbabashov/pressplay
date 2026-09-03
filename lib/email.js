// Sending mail, over HTTP, with no dependency.
//
// Resend's send endpoint is one POST with a JSON body, so a client is a fetch
// and an API key rather than a package to keep patched. Swapping provider later
// is this file and nothing else: everything upstream calls sendMail and reads
// the boolean back.
//
// Unconfigured, it does not throw and does not pretend. In development it logs
// the message so a reset link can be followed without a provider at all, which
// is the difference between the flow being testable and not.

const RESEND = 'https://api.resend.com/emails'

const env = k => {
  const v = process.env[k]
  return v && String(v).trim() ? String(v).trim() : null
}

export const mailer = () => ({
  key: env('RESEND_API_KEY'),
  // Resend will only send from a domain that has been verified with them. Until
  // one is, their onboarding address works for mail to your own inbox.
  from: env('MAIL_FROM') || 'Press Play <onboarding@resend.dev>'
})

export const canSendMail = () => Boolean(mailer().key)

// True when it went, false when it did not. Never throws: a page that fails
// because an email failed is a worse outcome than an email that has to be
// retried, and every caller here has something more useful to say than a stack.
export async function sendMail ({ to, subject, text, html }) {
  const { key, from } = mailer()

  if (!key) {
    // Not configured. In development that is not a failure, it is the normal
    // way to work on this: the link goes to the terminal instead of an inbox.
    if (process.env.NODE_ENV !== 'production') {
      console.log(`\n--- mail (no RESEND_API_KEY, printed instead) ---\nto: ${to}\nsubject: ${subject}\n\n${text}\n---\n`)
      return true
    }
    console.error('sendMail: RESEND_API_KEY is not set, so nothing was sent to', to)
    return false
  }

  try {
    const res = await fetch(RESEND, {
      method: 'POST',
      headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from, to: [to], subject, text, html })
    })
    if (!res.ok) {
      // The body says which of the many reasons it was, and it is for the log:
      // it can name an address, which is not the sender's to be shown.
      console.error('sendMail failed', res.status, (await res.text()).slice(0, 300))
      return false
    }
    return true
  } catch (e) {
    console.error('sendMail threw', e?.message)
    return false
  }
}
