'use client'

import { useState } from 'react'
import { ratingColor } from '@/lib/rating-colors'

// Three ways the same album can be scored. The custom preset is authored here
// rather than borrowed from anyone's catalogue: it exists to show that tiers,
// names and colours are all yours to set.
const PRESETS = [
  {
    id: 'ten',
    name: 'Ten point',
    note: 'The one most people already think in.',
    tiers: [10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map(v => ({
      v, label: ['Trash','Terrible','Awful','Bad','Meh','Mid','Decent','Good','Great','Amazing','Perfect'][v],
      color: ratingColor(v === 10 ? 9 : v).bg, fg: ratingColor(v === 10 ? 9 : v).fg
    }))
  },
  {
    id: 'eleven',
    name: 'Eleven point',
    note: 'Adds a tier above perfect, for the songs that change the record.',
    tiers: [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map(v => ({
      v, label: ['Trash','Terrible','Awful','Bad','Meh','Mid','Decent','Good','Great','Peak','Perfect','Majestic'][v],
      color: ratingColor(v).bg, fg: ratingColor(v).fg, glow: ratingColor(v).glow
    }))
  },
  {
    id: 'custom',
    name: 'Yours',
    note: 'Any number of tiers, any names, any colours.',
    tiers: [
      { v: 5, label: 'Album of the year', color: 'linear-gradient(135deg,#f0abfc,#a21caf)', fg: '#fff', glow: 'rgba(217,70,239,.55)' },
      { v: 4, label: 'On repeat', color: '#0ea5e9', fg: '#fff' },
      { v: 3, label: 'Solid', color: '#14b8a6', fg: '#022c22' },
      { v: 2, label: 'One good song', color: '#f59e0b', fg: '#3b2306' },
      { v: 1, label: 'Not for me', color: '#64748b', fg: '#f8fafc' }
    ]
  }
]

export default function ScalePresets () {
  const [active, setActive] = useState('eleven')
  const preset = PRESETS.find(p => p.id === active)

  return (
    <div className="presets">
      <div className="preset-tabs" role="tablist" aria-label="Rating scale presets">
        {PRESETS.map(p => (
          <button
            key={p.id} role="tab" aria-selected={active === p.id}
            className={`preset-tab${active === p.id ? ' on' : ''}`}
            onClick={() => setActive(p.id)}
          >
            {p.name}
          </button>
        ))}
      </div>
      <p className="preset-note">{preset.note}</p>
      <ul className="preset-ladder">
        {preset.tiers.map(t => (
          <li key={t.v}>
            <span className="preset-chip tnum" style={{
              background: t.color, color: t.fg,
              boxShadow: t.glow ? `0 0 26px ${t.glow}` : 'none'
            }}>{t.v}</span>
            <span className="preset-label">{t.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
