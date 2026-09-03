'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ratingColor } from '../../lib/rating-colors'

function Delta ({ places, isNew }) {
  if (isNew) return <span className="dl new">NEW</span>
  if (places === null || places === undefined) return <span className="dl flat">·</span>
  if (places === 0) return <span className="dl flat">—</span>
  const up = places > 0
  return (
    <span className={`dl ${up ? 'up' : 'down'}`}>
      {up ? '▲' : '▼'} {Math.abs(places)}
    </span>
  )
}

// Bands rather than a slider: the point of filtering a leaderboard is usually
// "show me the good ones", and a number nobody can quite hit is worse at that
// than four honest thresholds.
const BANDS = [
  ['9', 'Nine and up'],
  ['8', 'Eight and up'],
  ['7', 'Seven and up'],
  ['0', 'Under seven']
]

const ALL = 'all'

export default function Board ({ rows, snapshot }) {
  const [q, setQ] = useState('')
  const [year, setYear] = useState(ALL)
  const [artist, setArtist] = useState(ALL)
  const [genre, setGenre] = useState(ALL)
  const [band, setBand] = useState(ALL)
  const [snap, setSnap] = useState(snapshot)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Built from what has actually been rated, so no filter can ever be chosen
  // that returns nothing, and the lists shrink as the library does.
  const options = useMemo(() => {
    const uniq = pick => [...new Set(rows.map(pick).filter(Boolean))]
    return {
      years: uniq(r => r.year).sort((a, b) => Number(b) - Number(a)),
      artists: uniq(r => r.artist).sort((a, b) => a.localeCompare(b)),
      genres: uniq(r => r.genre).sort((a, b) => a.localeCompare(b))
    }
  }, [rows])

  const filtered = year !== ALL || artist !== ALL || genre !== ALL || band !== ALL || q.trim()

  const shown = useMemo(() => {
    const term = q.trim().toLowerCase()
    return rows.filter(r => {
      if (term && !`${r.albumName} ${r.artist}`.toLowerCase().includes(term)) return false
      if (year !== ALL && String(r.year ?? '') !== year) return false
      if (artist !== ALL && r.artist !== artist) return false
      if (genre !== ALL && r.genre !== genre) return false
      if (band !== ALL) {
        const n = Number(r.final)
        // The bottom band is the only one that is a ceiling rather than a floor.
        if (band === '0' ? !(n < 7) : !(n >= Number(band))) return false
      }
      return true
    })
  }, [rows, q, year, artist, genre, band])

  const clear = () => { setQ(''); setYear(ALL); setArtist(ALL); setGenre(ALL); setBand(ALL) }

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

      <div className="board-filters">
        <label>
          <span>Year</span>
          <select value={year} onChange={e => setYear(e.target.value)}>
            <option value={ALL}>All years</option>
            {options.years.map(y => <option key={y} value={String(y)}>{y}</option>)}
          </select>
        </label>
        <label>
          <span>Artist</span>
          <select value={artist} onChange={e => setArtist(e.target.value)}>
            <option value={ALL}>All artists</option>
            {options.artists.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </label>
        {options.genres.length > 0 && (
          <label>
            <span>Genre</span>
            <select value={genre} onChange={e => setGenre(e.target.value)}>
              <option value={ALL}>All genres</option>
              {options.genres.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </label>
        )}
        <label>
          <span>Score</span>
          <select value={band} onChange={e => setBand(e.target.value)}>
            <option value={ALL}>Any score</option>
            {BANDS.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
          </select>
        </label>
        {filtered && (
          <button type="button" className="board-clear" onClick={clear}>
            Clear
          </button>
        )}
      </div>

      {filtered && (
        <p className="board-count">
          {shown.length} of {rows.length}, keeping the place each one holds overall.
        </p>
      )}

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

      {shown.length === 0 && (
        <p className="notice">
          Nothing matches that.{' '}
          <button type="button" className="link-button" onClick={clear}>Clear the filters</button>
        </p>
      )}
    </>
  )
}
