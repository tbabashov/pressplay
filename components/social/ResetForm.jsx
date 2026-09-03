'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { fetchJson } from '@/lib/fetch-json'
import { PASSWORD_MIN } from '@/lib/password-rules'

export default function ResetForm () {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get('token') || ''

  const [password, setPassword] = useState('')
  const [again, setAgain] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  if (!token) {
    return (
      <p className="notice notice-bad">
        That link is missing its code. <Link href="/join">Ask for a new one</Link>.
      </p>
    )
  }

  if (done) {
    return (
      <>
        <p className="notice">Your password is changed. You can sign in with it now.</p>
        <Link className="btn-primary" href="/join">Sign in</Link>
      </>
    )
  }

  const submit = async e => {
    e.preventDefault()
    setError('')
    // Checked here so the second box is never sent: it exists to catch a typo.
    if (password !== again) return setError('The two passwords are not the same.')
    setBusy(true)
    try {
      await fetchJson('/api/auth/reset', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, password })
      })
      setDone(true)
      router.refresh()
    } catch (err) {
      setError(err.message || 'That did not work.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="pf" onSubmit={submit}>
      <label className="pf-field">
        <span className="pf-label">New password</span>
        <input
          type="password" value={password} autoComplete="new-password" autoFocus
          onChange={e => setPassword(e.target.value)} minLength={PASSWORD_MIN} required
        />
        <span className="pf-help">At least {PASSWORD_MIN} characters.</span>
      </label>
      <label className="pf-field">
        <span className="pf-label">New password again</span>
        <input
          type="password" value={again} autoComplete="new-password"
          onChange={e => setAgain(e.target.value)} minLength={PASSWORD_MIN} required
        />
      </label>
      <div className="pf-actions">
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Saving…' : 'Set my password'}
        </button>
      </div>
      {error && <p className="notice notice-bad">{error}</p>}
    </form>
  )
}
