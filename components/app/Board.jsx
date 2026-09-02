'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ratingColor } from '../../lib/rating-colors'

function Delta ({ places, isNew }) {
  if (isNew) return <span className="dl new">NEW</span>
  if (places === null || places === undefined) return <span className="dl flat">·</span>
  if (places === 0) return <span className="dl flat">-</span>
  const up = places > 0
  return (
    <span className={`dl ${up ? 'up' : 'down'}`}>
      {up ? '▲' : '▼'} {Math.abs(places)}
    </span>
  )
}

export default function Board ({ rows, snapshot }) {
  const [q, setQ] = useState('')
  const [snap, setSnap] = useState(snapshot)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase()
    if (!term) return rows
    return rows.filter(r => `${r.albumName} ${r.artist}`.toLowerCase().includes(term))
  }, [rows, q])

  const freeze = async () => {
    setBusy(true); setError('')
    try {
      const res = await fetch('/api/snapshot', { method: 'POST' })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Could not freeze the standings.')
      setSnap(body.snapshot)
    } catch (e) { setError(e.message) } finally { setBusy(false) }
  }

  const moved = rows.filter(r => r.rankDelta).length

  return (
    <>
      <div className="board-bar">
        <div className="search-field lib-search">
          <svg viewBox="0 0 24 24" aria-hidden="true" className="search-icon">
            <circle cx="10.5" cy="10.5" r="6.4" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="m15.4 15.4 4.2 4.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input value={q} onChange={e => setQ(e.target.value)}
            placeholder="Find an album" aria-label="Find an album in the standings" />
        </div>
        <div className="board-actions">
          <button className="chip" onClick={freeze} disabled={busy}>
            {busy ? 'Freezing…' : snap ? 'Re-freeze standings' : 'Freeze standings'}
          </button>
          <Link className="btn-primary" href="/app/board/export">Export the board</Link>
        </div>
      </div>

      <p className="board-note">
        {snap
          ? `Frozen ${new Date(snap.takenAt).toLocaleDateString()}. ${moved} album${moved === 1 ? ' has' : 's have'} moved since.`
          : 'Freeze the standings and every later change shows as places gained or lost.'}
      </p>

      {error && <p className="notice notice-bad">{error}</p>}

      <ol className="board glass-list">
        {shown.map(r => {
          const c = ratingColor(Math.round(r.final), r.scaleModel)
          return (
            <li key={r.albumId} className={r.rank <= 3 ? 'top' : undefined}>
              <span className="bd-rank tnum">{r.rank}</span>
              <span className="bd-delta"><Delta places={r.rankDelta} isNew={r.isNew} /></span>
              <Link className="bd-main" href={`/app/rate/${encodeURIComponent(r.albumId)}`}>
                {r.cover ? <img src={r.cover} alt="" loading="lazy" /> : <span className="bd-blank" />}
                <span className="bd-id">
                  <strong>{r.albumName}</strong>
                  <em>{r.artist}</em>
                </span>
              </Link>
              <span
                className="bd-score tnum"
                style={{ background: c.bg, color: c.fg, boxShadow: c.glow ? `0 0 30px ${c.glow}` : undefined }}
              >
                {r.final.toFixed(1)}
              </span>
            </li>
          )
        })}
      </ol>

      {shown.length === 0 && <p className="notice">Nothing matches “{q}”.</p>}
    </>
  )
}
