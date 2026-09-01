'use client'

import { useState } from 'react'
import { splitNames } from '@/lib/credits'

// Features were one text box split on commas, which cannot hold a name that
// contains one: typing Tyler, The Creator produced two guests called Tyler and
// The Creator. They are separate things now, added one at a time, so a comma in
// a name is just a comma.
export default function FeatureInput ({ value = [], onChange, label }) {
  const [draft, setDraft] = useState('')

  const add = text => {
    // Pasting a whole credit line still splits, because that is what was meant;
    // typing does not, because it is one name.
    const names = text.includes(',') || /\s&\s/.test(text) ? splitNames(text) : [text.trim()]
    const next = [...value]
    for (const n of names) {
      if (n && !next.some(x => x.toLowerCase() === n.toLowerCase())) next.push(n)
    }
    onChange(next)
    setDraft('')
  }

  return (
    <div className="fi">
      {value.map(name => (
        <span className="fi-tag" key={name}>
          {name}
          <button
            type="button"
            onClick={() => onChange(value.filter(x => x !== name))}
            aria-label={`Remove ${name}`}
          >
            <svg viewBox="0 0 24 24"><path d="M6.5 6.5l11 11m0-11l-11 11" fill="none"
              stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" /></svg>
          </button>
        </span>
      ))}
      <input
        className="fi-draft"
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') { e.preventDefault(); if (draft.trim()) add(draft) }
          // Backspace on an empty box takes back the last one, which is what
          // every tag field does and what the hand expects.
          if (e.key === 'Backspace' && !draft && value.length) {
            onChange(value.slice(0, -1))
          }
        }}
        onBlur={() => { if (draft.trim()) add(draft) }}
        placeholder={value.length ? 'Add another' : (label || 'Add a feature')}
        aria-label={label || 'Add a feature'}
      />
    </div>
  )
}
