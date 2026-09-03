'use client'

import { useState } from 'react'
import { fetchJson } from '@/lib/fetch-json'

export default function ForgotForm () {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  const submit = async e => {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const r = await fetchJson('/api/auth/reset', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email })
      })
      setSent(r.message || true)
    } catch (err) {
      setError(err.message || 'That did not work.')
    } finally {
      setBusy(false)
    }
  }

  // The same answer either way. Telling somebody an address is not registered
  // turns this form into a way to find out which addresses are.
  if (sent) {
    return (
      <p className="notice">
        If that address has a password on it, a link is on its way. It works once and expires in
        an hour.
      </p>
    )
  }

  return (
    <form className="jn-form" onSubmit={submit}>
      <label className="jn-field">
        <span>Email</span>
        <input
          type="email" value={email} autoComplete="email" autoFocus required
          onChange={e => setEmail(e.target.value)} placeholder="you@example.com"
        />
      </label>
      <button type="submit" className="btn-primary jn-submit" disabled={busy}>
        {busy ? 'Sending…' : 'Send me a link'}
      </button>
      {error && <p className="jn-error">{error}</p>}
    </form>
  )
}
