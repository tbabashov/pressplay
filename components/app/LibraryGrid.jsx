'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ratingColor } from '../../lib/rating-colors'

const SORTS = [
  ['rating', 'Rating', r => (r.final ?? -1)],
  ['title', 'Title', r => (r.albumName || '').toLowerCase()],
  ['artist', 'Artist', r => (r.artist || '').toLowerCase()],
  ['length', 'Length', r => r.runtimeMs || 0],
  ['songs', 'Songs', r => r.songs || 0],
  ['year', 'Year', r => Number(r.year) || 0],
  ['added', 'Date rated', r => r.createdAt || '']
]

// Sensible starting direction per field: nobody wants their worst albums or
// Z-first artists at the top by default.
const DEFAULT_DIR = { rating: 'desc', title: 'asc', artist: 'asc', length: 'desc', songs: 'desc', year: 'desc', added: 'desc' }

const fmtRuntime = ms => {
  if (!ms) return null
  const m = Math.round(ms / 60000)
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`
}

export default function LibraryGrid ({ reviews }) {
  const [items, setItems] = useState(reviews)
  const [confirm, setConfirm] = useState(null)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [sort, setSort] = useState('rating')
  const [dir, setDir] = useState('desc')

  const pickSort = key => {
    if (key === sort) setDir(d => (d === 'asc' ? 'desc' : 'asc'))
    else { setSort(key); setDir(DEFAULT_DIR[key] || 'desc') }
  }

  const remove = async albumId => {
    setBusy(albumId); setError('')
    const snapshot = items
    setItems(list => list.filter(r => r.albumId !== albumId))
    try {
      const res = await fetch(`/api/reviews/${encodeURIComponent(albumId)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error || 'Could not remove it.')
    } catch (e) {
      setItems(snapshot)
      setError(e.message)
    } finally { setBusy(null); setConfirm(null) }
  }

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase()
    const matched = term
      ? items.filter(r => `${r.albumName} ${r.artist} ${r.year || ''}`.toLowerCase().includes(term))
      : items
    const get = SORTS.find(([k]) => k === sort)?.[2] ?? (() => 0)
    const sign = dir === 'asc' ? 1 : -1
    return [...matched].sort((a, b) => {
      const x = get(a), y = get(b)
      if (x < y) return -1 * sign
      if (x > y) return 1 * sign
      // Stable tiebreak, so equal ratings do not shuffle between renders.
      return (a.albumName || '').localeCompare(b.albumName || '')
    })
  }, [items, q, sort, dir])

  return (
    <>
      <div className="lib-bar">
        <div className="search-field lib-search">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="search-icon">
            <circle cx="10.5" cy="10.5" r="6.4" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="m15.4 15.4 4.2 4.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search album, artist or year" aria-label="Search your library" />
        </div>
        <span className="lib-count">{shown.length} of {items.length}</span>
      </div>

      <div className="lib-sorts" role="group" aria-label="Sort by">
        {SORTS.map(([key, label]) => {
          const on = sort === key
          return (
            <button
              key={key}
              className={`sortchip${on ? ' on' : ''}`}
              onClick={() => pickSort(key)}
              aria-pressed={on}
              title={on ? `Sorted by ${label}, ${dir === 'asc' ? 'ascending' : 'descending'}. Click to reverse.` : `Sort by ${label}`}
            >
              {label}
              {on && (
                <svg viewBox="0 0 12 12" aria-hidden="true" className={dir === 'asc' ? 'up' : ''}>
                  <path d="M6 9V3m0 6L3 6m3 3 3-3" fill="none" stroke="currentColor"
                    strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>
          )
        })}
      </div>

      {error && <p className="notice notice-bad">{error}</p>}
      {shown.length === 0 && <p className="notice">Nothing matches “{q}”.</p>}

      <ul className="grid">
        {shown.map(r => {
          const c = r.final === null || r.final === undefined ? null : ratingColor(r.final)
          const asking = confirm === r.albumId
          const meta = sort === 'length' ? fmtRuntime(r.runtimeMs)
            : sort === 'songs' ? `${r.songs} songs`
              : sort === 'year' ? r.year
                : null
          return (
            <li key={r.albumId} className="lib-item">
              <Link className="tile" href={`/app/rate/${encodeURIComponent(r.albumId)}`}>
                {/* The chip breaks the corner of the sleeve rather than sitting
                    inside it, which is how it reads on the exported frames. */}
                <span className="tile-shot">
                  <span className="tile-art">
                    {r.cover ? <img src={r.cover} alt="" loading="lazy" /> : <span className="tile-blank" />}
                  </span>
                  {c && (
                    <span
                      className="tile-score tnum"
                      style={{ background: c.bg, color: c.fg, boxShadow: c.glow ? `0 0 26px ${c.glow}` : undefined }}
                    >
                      {Number(r.final).toFixed(1)}
                    </span>
                  )}
                </span>
                <strong>{r.albumName || 'Untitled'}</strong>
                <span className="tile-sub">
                  {r.artist}
                  {meta && <em className="tile-meta">{meta}</em>}
                </span>
              </Link>

              <button className="lib-x" onClick={() => setConfirm(asking ? null : r.albumId)}
                aria-label={`Remove ${r.albumName} from your library`}>
                <svg viewBox="0 0 24 24"><path d="M6.5 6.5l11 11m0-11l-11 11" fill="none"
                  stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
              </button>

              {asking && (
                <div className="lib-confirm" role="alertdialog" aria-label="Confirm removal">
                  <p>Remove this rating?</p>
                  <div>
                    <button className="lib-yes" onClick={() => remove(r.albumId)} disabled={busy === r.albumId}>
                      {busy === r.albumId ? 'Removing' : 'Remove'}
                    </button>
                    <button className="lib-no" onClick={() => setConfirm(null)}>Keep</button>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}
