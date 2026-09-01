'use client'

import { useMemo, useState } from 'react'
import { SUPERLATIVES, SUPERLATIVE_MAX } from '@/lib/preferences'

// Twenty six superlatives is too many to scan, which is the whole reason for
// the filter: type what you are after rather than reading the list. The ones
// already turned on stay visible whatever is typed, so filtering can never hide
// a choice you have made and make it look lost.
export default function SuperlativePicker ({ chosen, onToggle, compact }) {
  const [q, setQ] = useState('')

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return SUPERLATIVES
    return SUPERLATIVES.filter(s =>
      chosen.includes(s.key) || s.label.toLowerCase().includes(term))
  }, [q, chosen])

  const full = chosen.length >= SUPERLATIVE_MAX

  return (
    <div className={`sp${compact ? ' sp-compact' : ''}`}>
      <div className="search-field sp-search">
        <svg viewBox="0 0 24 24" aria-hidden="true" className="search-icon">
          <circle cx="10.5" cy="10.5" r="6.4" fill="none" stroke="currentColor" strokeWidth="2" />
          <path d="m15.4 15.4 4.2 4.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          value={q} onChange={e => setQ(e.target.value)}
          placeholder="Filter superlatives" aria-label="Filter superlatives"
        />
        {q && (
          <button className="search-clear" onClick={() => setQ('')} aria-label="Clear the filter">
            <svg viewBox="0 0 24 24"><path d="M6.5 6.5l11 11m0-11l-11 11" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        )}
      </div>

      <p className="sp-count">
        {chosen.length} of {SUPERLATIVE_MAX} chosen
        {full && ' · turn one off to add another'}
      </p>

      <ul className="rm-supers">
        {shown.map(s => {
          const on = chosen.includes(s.key)
          const blocked = !on && full
          return (
            <li key={s.key}>
              <label className={`rm-super${on ? ' on' : ''}${blocked ? ' full' : ''}`}>
                <input type="checkbox" checked={on} disabled={blocked} onChange={() => onToggle(s.key)} />
                <span>{s.label}</span>
                {s.note && <em>{s.note}</em>}
              </label>
            </li>
          )
        })}
        {shown.length === 0 && <li className="sp-none">Nothing matches “{q}”.</li>}
      </ul>
    </div>
  )
}
