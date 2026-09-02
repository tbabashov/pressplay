'use client'

import { useState } from 'react'

// The button that will start a checkout. It posts to one route and does what
// that route says, so nothing here has to change when a provider is connected:
// a url comes back, and this follows it.
export default function CheckoutButton ({ tier, name, period = 'monthly', className = 'btn-primary', children }) {
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  const go = async () => {
    setBusy(true); setNote('')
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ tier, period })
      })
      const data = await res.json().catch(() => null)
      if (data?.url) { window.location.href = data.url; return }
      if (data?.signIn) { window.location.href = data.signIn; return }
      setNote(data?.message || data?.error || 'That did not go through.')
    } catch {
      setNote('No answer from the server. Try again in a moment.')
    } finally { setBusy(false) }
  }

  return (
    <>
      <button className={className} onClick={go} disabled={busy}>
        {busy ? 'One moment…' : (children || `Get ${name || tier}`)}
      </button>
      {note && <p className="co-note">{note}</p>}
    </>
  )
}
