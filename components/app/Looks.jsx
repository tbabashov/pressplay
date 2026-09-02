'use client'

import { useState } from 'react'
import { LOOK_FIELDS, LOOK_NAME_MAX } from '@/lib/preferences'

// Saved looks: the export settings under a name, so the same treatment goes on
// the next record without setting it up again. Stored with the account rather
// than with a review, because a look is how you present records generally.
export default function Looks ({ settings, apply, tier, limit, initial = [], onLocked }) {
  const [looks, setLooks] = useState(initial)
  const [naming, setNaming] = useState(false)
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  const save = async next => {
    const before = looks
    setLooks(next); setError('')
    try {
      const res = await fetch('/api/preferences', {
        method: 'PUT',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ looks: next })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'That did not save.')
      // The server trims to the tier, so what comes back is the truth.
      setLooks(data.preferences.looks)
    } catch (e) {
      setLooks(before)
      setError(e.message)
    }
  }

  const add = () => {
    const label = name.replace(/\s+/g, ' ').trim().slice(0, LOOK_NAME_MAX)
    if (!label) return
    const kept = {}
    for (const k of LOOK_FIELDS) if (settings[k] !== undefined) kept[k] = settings[k]
    save([...looks, { id: `l${Date.now().toString(36)}`, name: label, settings: kept }])
    setName(''); setNaming(false)
  }

  const full = limit !== null && looks.length >= limit

  if (limit === 0) {
    return (
      <div className="lk">
        <button className="lk-add" onClick={() => onLocked?.('Saved looks come with Plus.')}>
          Save this look
        </button>
        <p className="lk-note">Keep a treatment and put it on the next record in one press.</p>
      </div>
    )
  }

  return (
    <div className="lk">
      <div className="lk-row">
        {looks.map(l => (
          <span key={l.id} className="lk-one">
            <button className="lk-use" onClick={() => apply(l.settings)} title={`Apply ${l.name}`}>
              {l.name}
            </button>
            <button
              className="lk-x"
              onClick={() => save(looks.filter(x => x.id !== l.id))}
              aria-label={`Delete ${l.name}`}
            >
              <svg viewBox="0 0 24 24"><path d="M6.5 6.5l11 11m0-11l-11 11" fill="none"
                stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
            </button>
          </span>
        ))}

        {naming ? (
          <span className="lk-name">
            <input
              autoFocus value={name} maxLength={LOOK_NAME_MAX}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.preventDefault(); add() }
                if (e.key === 'Escape') { setNaming(false); setName('') }
              }}
              placeholder="Name this look"
            />
            <button className="lk-ok" onClick={add} disabled={!name.trim()}>Save</button>
          </span>
        ) : (
          <button
            className="lk-add"
            onClick={() => (full
              ? onLocked?.(limit === null ? '' : `That is ${limit} saved looks.`)
              : setNaming(true))}
          >
            Save this look
          </button>
        )}
      </div>
      {error && <p className="cut-error">{error}</p>}
    </div>
  )
}
