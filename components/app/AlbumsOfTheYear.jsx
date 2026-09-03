'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { chipColour } from '../../lib/rating-colors'

// Your own albums of the year, for every year you have rated something from.
//
// It opens on the most recent year there is anything for rather than on the
// current one: a list headed 2026 with nothing under it says the feature is
// broken, when the truth is only that nothing from 2026 has been rated yet.
export default function AlbumsOfTheYear ({ albums }) {
  const byYear = useMemo(() => {
    const m = new Map()
    for (const a of albums) {
      const y = Number(a.year)
      // A year has to be a real one and the album has to have a score, or it
      // cannot be placed in an order.
      if (!Number.isFinite(y) || y < 1900 || typeof a.final !== 'number') continue
      if (!m.has(y)) m.set(y, [])
      m.get(y).push(a)
    }
    // Ties break on the title, so the order is the same on every render rather
    // than whatever the library happened to be in.
    for (const list of m.values()) {
      list.sort((x, y2) => y2.final - x.final || x.albumName.localeCompare(y2.albumName))
    }
    return m
  }, [albums])

  const years = useMemo(() => [...byYear.keys()].sort((a, b) => b - a), [byYear])
  const [year, setYear] = useState(() => years[0] ?? null)

  if (!years.length) return null

  // The stored year can go out of date when a rating is deleted, so it falls
  // back rather than rendering an empty list.
  const active = years.includes(year) ? year : years[0]
  const list = byYear.get(active) || []

  return (
    <section className="ts-block">
      <h2 className="ts-h2">Your albums of the year</h2>

      {/* A list, not a chip for every year. Forty years of rated albums made
          three wrapped rows of buttons that pushed the ranking off the screen,
          and no year in them was easier to find than in a list. */}
      <div className="aoty-head">
        <select
          className="aoty-pick"
          value={active}
          onChange={e => setYear(Number(e.target.value))}
          aria-label="Which year to rank"
        >
          {years.map(y => (
            <option key={y} value={y}>
              {y} ({byYear.get(y).length})
            </option>
          ))}
        </select>
        <span className="aoty-count">
          {list.length} rated in {active}
        </span>
      </div>

      <ol className="aoty-list glass-list">
        {list.map((a, i) => {
          const c = chipColour(Math.round(a.final), a.scaleModel)
          return (
            <li key={a.albumId}>
              <span className="aoty-rank tnum">{i + 1}</span>
              <Link className="aoty-main" href={`/app/rate/${encodeURIComponent(a.albumId)}`}>
                {a.cover
                  ? <img src={a.cover} alt="" loading="lazy" width="40" height="40" />
                  : <span className="aoty-blank" aria-hidden="true" />}
                <span className="aoty-id">
                  <strong>{a.albumName}</strong>
                  <em>{a.artist}</em>
                </span>
              </Link>
              <span
                className="aoty-score tnum"
                style={{
                  background: c.bg,
                  color: c.fg,
                  boxShadow: c.glow ? `0 0 26px ${c.glow}` : undefined
                }}
              >
                {a.final.toFixed(1)}
              </span>
            </li>
          )
        })}
      </ol>
    </section>
  )
}
