'use client'

import { useState } from 'react'
import { signOut } from 'next-auth/react'
import { fetchJson } from '@/lib/fetch-json'

// Two different destructions, kept apart because they are not the same
// decision: one empties the account, one ends it. Both ask for the handle to
// be typed, because a dialog with a red button in it gets dismissed by reflex
// and typing your own name does not.
const ACTIONS = {
  data: {
    title: 'Delete everything you have made',
    body: 'Every rating, every comment, every vote, your discographies, your saved looks and ' +
      'your slide settings. Your account stays, so you can start again without signing up twice.',
    button: 'Delete my data'
  },
  account: {
    title: 'Delete your account',
    body: 'Everything above, and the account itself. Your handle is released and your public ' +
      'page stops existing. You will be signed out. This cannot be undone.',
    button: 'Delete my account'
  }
}

export default function DangerZone ({ handle }) {
  const [open, setOpen] = useState(null)
  const [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState('')

  const run = async scope => {
    setBusy(true); setError('')
    try {
      const data = await fetchJson('/api/account', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ scope, confirm })
      })
      if (scope === 'account') {
        await signOut({ callbackUrl: '/' })
        return
      }
      setDone(`${data.removed} things removed.`)
      setOpen(null); setConfirm('')
      // The pages behind this are server rendered from what was just deleted.
      setTimeout(() => window.location.reload(), 900)
    } catch (e) {
      setError(e.message)
    } finally { setBusy(false) }
  }

  return (
    <section className="dz">
      <h2 className="dz-title">Danger zone</h2>

      {Object.entries(ACTIONS).map(([scope, a]) => (
        <div className={`dz-row${open === scope ? ' open' : ''}`} key={scope}>
          <div className="dz-say">
            <strong>{a.title}</strong>
            <p>{a.body}</p>
          </div>

          {open === scope ? (
            <div className="dz-confirm">
              <label>
                <span>Type <b>{handle}</b> to confirm</span>
                <input
                  value={confirm} autoFocus
                  onChange={e => setConfirm(e.target.value)}
                  placeholder={handle}
                  aria-label={`Type ${handle} to confirm`}
                />
              </label>
              <div className="dz-do">
                <button
                  className="dz-go"
                  disabled={busy || confirm.trim().toLowerCase() !== (handle || '').toLowerCase()}
                  onClick={() => run(scope)}
                >
                  {busy ? 'Deleting' : a.button}
                </button>
                <button className="dz-cancel" onClick={() => { setOpen(null); setConfirm(''); setError('') }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button className="dz-open" onClick={() => { setOpen(scope); setConfirm(''); setError('') }}>
              {a.button}
            </button>
          )}
        </div>
      ))}

      {error && <p className="dz-error">{error}</p>}
      {done && <p className="dz-done">{done}</p>}
    </section>
  )
}
