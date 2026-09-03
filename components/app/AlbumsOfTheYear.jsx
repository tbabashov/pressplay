'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ratingColor } from '../../lib/rating-colors'

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
      <h2 className="ts-h2">Your albums of {active}</h2>

      <div className="aoty-years" role="group" aria-label="Pick a year">
        {years.map(y => (
          <button
            key={y}
            type="button"
            className={`aoty-year tnum${y === active ? ' on' : ''}`}
            aria-pressed={y === active}
            onClick={() => setYear(y)}
          >
            {y}
            <em>{byYear.get(y).length}</em>
          </button>
        ))}
      </div>

      <ol className="aoty-list glass-list">
        {list.map((a, i) => {
          const c = ratingColor(Math.round(a.final), a.scaleModel)
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
