'use client'

import { useState } from 'react'
import { fetchJson } from '@/lib/fetch-json'
import { PASSWORD_MIN } from '@/lib/password-rules'

// Only rendered for an account that has a password. One that signs in with
// Google has none, and offering to change a password that does not exist is
// a form that can only ever fail.
export default function PasswordForm () {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [again, setAgain] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const submit = async e => {
    e.preventDefault()
    setError(''); setDone(false)

    // Checked here as well as on the server so the second box is not sent
    // anywhere: it exists to catch a typo, not to be stored or compared.
    if (next !== again) return setError('The two new passwords are not the same.')

    setBusy(true)
    try {
      await fetchJson('/api/account/password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ current, next })
      })
      setCurrent(''); setNext(''); setAgain('')
      setDone(true)
    } catch (err) {
      setError(err.message || 'That did not work.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="pf" onSubmit={submit}>
      <label className="pf-field">
        <span className="pf-label">Current password</span>
        <input
          type="password" value={current} autoComplete="current-password"
          onChange={e => { setCurrent(e.target.value); setDone(false) }}
          required
        />
      </label>

      <label className="pf-field">
        <span className="pf-label">New password</span>
        <input
          type="password" value={next} autoComplete="new-password"
          onChange={e => { setNext(e.target.value); setDone(false) }}
          minLength={PASSWORD_MIN} required
        />
        <span className="pf-help">At least {PASSWORD_MIN} characters.</span>
      </label>

      <label className="pf-field">
        <span className="pf-label">New password again</span>
        <input
          type="password" value={again} autoComplete="new-password"
          onChange={e => { setAgain(e.target.value); setDone(false) }}
          minLength={PASSWORD_MIN} required
        />
      </label>

      <div className="pf-actions">
        <button type="submit" className="btn-primary" disabled={busy}>
          {busy ? 'Changing...' : 'Change password'}
        </button>
        {done && <span className="pf-saved">Password changed.</span>}
      </div>

      {error && <p className="notice notice-bad">{error}</p>}
    </form>
  )
}
