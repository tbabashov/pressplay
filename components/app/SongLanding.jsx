'use client'

import { useState } from 'react'
import { chipColour } from '@/lib/rating-colors'
import { fmtScore } from '@/lib/scales'

// The distribution, one rating system at a time.
//
// A rater can change ladders, and plenty have: the account starts on the ten,
// the eleven is still there for anyone who was on it, and a scale can be built
// from scratch. Every one of those leaves reviews behind it, so a library is
// not necessarily scored in one currency. Drawn as a single chart it read as
// though it were — a six out of ten and a six out of a hundred stacked on the
// same rung — which is a graph making a claim the data does not support.
//
// So each ladder gets its own, and the picker chooses between them. Every group
// arrives fully computed from the server; switching is local, because the work
// is already done and a round trip to re-slice numbers already in the page
// would be latency bought for nothing.
export default function SongLanding ({ groups }) {
  const [key, setKey] = useState(groups[0]?.key ?? null)
  if (!groups.length) return null

  // Falls back rather than blanks. The stored key can name a group that is no
  // longer here if the library changed under an open page.
  const g = groups.find(x => x.key === key) || groups[0]

  return (
    <section className="ts-block">
      <div className="ts-block-head">
        <h2 className="ts-h2">Where your songs land</h2>

        {/* One ladder needs no choosing. The picker appears when there is
            genuinely something to choose between, rather than sitting there as
            a control with a single option in it. */}
        {groups.length > 1 && (
          <label className="ts-scale-pick">
            <span>Rating system</span>
            <select value={g.key} onChange={e => setKey(e.target.value)}>
              {groups.map(o => (
                <option key={o.key} value={o.key}>{o.label}</option>
              ))}
            </select>
          </label>
        )}
      </div>

      <p className="ts-note">
        {g.songs} song{g.songs === 1 ? '' : 's'} on the ladder
        {g.skits > 0 && <>, and {g.skits} marked N/A and kept out of every average</>}
        .{' '}
        {/* Which slice of the library this is. Without it the numbers read as
            the whole library on every ladder in the list. */}
        {groups.length > 1 && (
          <>From {g.albums} album{g.albums === 1 ? '' : 's'} rated on it. </>
        )}
        Your song average here is {fmtScore(g.average, g.scale)}.
      </p>

      <ol className="ts-ladder">
        {[...g.buckets].reverse().map(b => {
          const c = chipColour(b.score, g.scale)
          const flat = typeof c.bg === 'string' && c.bg.startsWith('#')
          return (
            <li key={b.score}>
              <span className="ts-tier tnum" style={{ color: flat ? c.bg : undefined }}>
                {b.score}
              </span>
              <span className="ts-tier-name">{b.name}</span>
              <span className="ts-bar">
                <i style={{ width: `${(b.count / g.peak) * 100}%`, background: c.bg }} />
              </span>
              <span className="ts-count tnum">{b.count || ''}</span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
