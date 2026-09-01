'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePlayer } from '../audio/Player'
import Meter from '../audio/Meter'
import { dominant } from '../../lib/palette'
import { ratingColor } from '../../lib/rating-colors'
import { NA, MAX_SCORE } from '../../lib/rating-scale'
import { superlativeByKey, DEFAULT_PREFERENCES } from '../../lib/preferences'
import AlbumDetails from './AlbumDetails'
import { fmtTime } from '../../lib/music'
import { toSnapshot } from '../../lib/album-shape'

// Accepts 0-11, a decimal, or a dash for N/A. Anything else is simply ignored
// rather than bounced with an error, so typing never fights the user.
function parseScore (raw) {
  const s = String(raw).trim()
  if (s === '') return null
  if (s === '-' || s === '–' || s.toLowerCase() === 'n' || s.toLowerCase() === 'na') return NA
  const n = Number(s)
  if (!Number.isFinite(n)) return undefined
  return Math.min(MAX_SCORE, Math.max(0, n))
}

// ratingColor returns { bg, fg }: bg may be a gradient, which is fine behind a
// chip but never as a text colour, so the headline number falls back to the
// room accent whenever its tier is a gradient.
const tierStyle = v => {
  const c = ratingColor(v)
  return { background: c.bg, color: c.fg, borderColor: 'transparent' }
}
const finalStyle = v => {
  if (v === null) return undefined
  const c = ratingColor(Math.round(v))
  return {
    background: c.bg,
    color: c.fg,
    boxShadow: c.glow ? `0 0 46px ${c.glow}` : 'none'
  }
}

// Same-origin so the canvas can read it.
const proxied = url => (url ? `/api/art?u=${encodeURIComponent(url)}` : null)

export default function Rater ({ album: source, initial = null, canSave = true, preferences = DEFAULT_PREFERENCES }) {
  // The album is editable, so it is state rather than a prop read straight
  // through. Corrections are saved on the review's own snapshot with everything
  // else, which is why they survive the catalogue changing underneath.
  const [album, setAlbum] = useState(source)
  const [details, setDetails] = useState(false)
  useEffect(() => { setAlbum(source) }, [source])
  // The rater's own instrument, not a fixed five. Renaming one keeps its key,
  // so scores already filed under it stay attached.
  const editAlbum = next => { setAlbum(next); setSave({ state: 'idle', message: '' }) }

  const CRITERIA = preferences.criteria.map(c => [c.key, c.label])
  const picks = preferences.superlatives.map(k => superlativeByKey[k]).filter(Boolean)
  const { track, playing, play } = usePlayer()
  const art = proxied(album.cover)

  // The record lights the workbench: the whole screen takes the cover's colour.
  useEffect(() => {
    if (!art) return
    let dead = false
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      if (dead) return
      const rgb = dominant(img)
      if (!rgb) return
      const r = document.documentElement
      r.style.setProperty('--accent', `rgb(${rgb})`)
      r.style.setProperty('--accent-rgb', rgb)
      r.style.setProperty('--accent-soft', `rgba(${rgb}, 0.34)`)
    }
    img.src = art
    return () => { dead = true }
  }, [art])
  const [scores, setScores] = useState(initial?.scores ?? {})
  const [criteria, setCriteria] = useState(initial?.criteria ?? {})
  const [override, setOverride] = useState(initial?.finalOverride ?? '')
  const [selections, setSelections] = useState(initial?.selections ?? {})
  const [nowPlaying, setNowPlaying] = useState(initial?.nowPlaying ?? '')
  const [save, setSave] = useState({ state: initial ? 'saved' : 'idle', message: '' })

  // Any edit puts the review back into an unsaved state.
  const touch = fn => (...a) => { setSave(s => (s.state === 'saved' ? { state: 'idle', message: '' } : s)); fn(...a) }

  const setScore = touch((id, raw) => {
    const v = parseScore(raw)
    if (v === undefined) return
    setScores(s => (v === null ? (({ [id]: _, ...rest }) => rest)(s) : { ...s, [id]: v }))
  })

  const rated = useMemo(
    () => Object.values(scores).filter(v => typeof v === 'number'),
    [scores]
  )
  const songAverage = rated.length ? rated.reduce((a, b) => a + b, 0) / rated.length : null

  // Every criterion that has a value votes once, and the song average votes once.
  const parts = useMemo(() => {
    const p = []
    if (songAverage !== null) p.push(songAverage)
    for (const [key] of CRITERIA) {
      const n = Number(criteria[key])
      if (criteria[key] !== '' && criteria[key] !== undefined && Number.isFinite(n)) p.push(n)
    }
    return p
  }, [songAverage, criteria])

  const computed = parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : null
  const manual = override.trim() === '' ? null : Number(override)
  const final = Number.isFinite(manual) ? manual : computed

  const done = Object.keys(scores).length
  const topScored = useMemo(() => {
    const e = Object.entries(scores).filter(([, v]) => typeof v === 'number')
    if (!e.length) return null
    const [id] = e.reduce((a, b) => (b[1] > a[1] ? b : a))
    return album.tracks.find(t => t.id === id)?.title ?? null
  }, [scores, album.tracks])

  const pick = touch((key, value) => setSelections(s => ({ ...s, [key]: value })))

  const persist = async () => {
    setSave({ state: 'saving', message: '' })
    try {
      const r = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          albumId: album.id, albumName: album.name, artist: album.artist,
          cover: album.cover, year: album.year,
          scores, criteria, finalOverride: override, final,
          selections, nowPlaying,
          criteriaModel: preferences.criteria,
          album: toSnapshot(album)
        })
      })
      const body = await r.json()
      if (!r.ok) throw new Error(body.error || 'Could not save.')
      setSave({ state: 'saved', message: '' })
    } catch (e) {
      setSave({ state: 'error', message: e.message })
    }
  }

  const label = {
    idle: 'Save to your library',
    saving: 'Saving',
    saved: 'Saved',
    error: 'Try saving again'
  }[save.state]

  return (
    <div className="rater">
      <div className="rater-bg" aria-hidden="true">
        <img src={album.cover} alt="" />
      </div>

      <aside className="rater-side">
        <div className="rater-art">
          <img src={album.cover} alt="" />
        </div>
        <h1 className="rater-title">{album.name}</h1>
        <p className="rater-by">{album.artist}</p>
        <ul className="rater-meta">
          {album.year && <li><span>Released</span><b>{album.year}</b></li>}
          {album.genre && <li><span>Genre</span><b>{album.genre}</b></li>}
          <li><span>Tracks</span><b>{album.tracks.length}</b></li>
          <li><span>Runtime</span><b>{fmtTime(album.runtime)}</b></li>
        </ul>

        <div className="rater-progress">
          <div className="rater-progress-bar">
            <i style={{ transform: `scaleX(${album.tracks.length ? done / album.tracks.length : 0})` }} />
          </div>
          <p>{done} of {album.tracks.length} scored</p>
        </div>

        <button className="rater-edit" onClick={() => setDetails(true)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z" fill="none" stroke="currentColor"
              strokeWidth="1.8" strokeLinejoin="round" />
          </svg>
          Edit details
        </button>

        <p className="rater-hint">0 to 11, or a dash for N/A.</p>
      </aside>

      <AlbumDetails
        album={album} onChange={editAlbum}
        open={details} onClose={() => setDetails(false)}
      />

      <div className="rater-main">
        <ol className="tracks">
          {album.tracks.map(t => {
            const v = scores[t.id]
            const on = track?.dz === t.id
            const has = v !== undefined
            return (
              <li key={t.id} className={`trk${on ? ' on' : ''}${has ? ' has' : ''}`}>
                <em className="trk-n">{t.n}</em>

                <button
                  className="trk-play"
                  onClick={() => play({ dz: t.id, cover: album.cover, artist: album.artist, track: t.title, name: album.name })}
                  disabled={!t.preview}
                  aria-label={t.preview ? `Play ${t.title}` : `No preview for ${t.title}`}
                  title={t.preview ? `Play ${t.title}` : 'No preview for this track'}
                >
                  {on && playing
                    ? <svg viewBox="0 0 24 24"><rect x="7" y="5.5" width="3.4" height="13" rx="1.2" /><rect x="13.6" y="5.5" width="3.4" height="13" rx="1.2" /></svg>
                    : <svg viewBox="0 0 24 24"><path d="M8.5 5.6v12.8a.8.8 0 0 0 1.22.68l10.1-6.4a.8.8 0 0 0 0-1.36L9.72 4.92a.8.8 0 0 0-1.22.68Z" /></svg>}
                </button>

                <span className="trk-name">
                  <strong>{t.title}</strong>
                  {t.features.length > 0 && <em>ft. {t.features.join(', ')}</em>}
                </span>

                {on && playing
                  ? <Meter bars={13} className="trk-meter" />
                  : <span className="trk-time">{fmtTime(t.duration)}</span>}

                <input
                  className="trk-score"
                  value={v === NA ? '–' : v ?? ''}
                  onChange={e => setScore(t.id, e.target.value)}
                  placeholder=""
                  title="0 to 11, or a dash for N/A"
                  inputMode="decimal"
                  aria-label={`Score for ${t.title}`}
                  style={has ? tierStyle(v) : undefined}
                />
              </li>
            )
          })}
        </ol>
      </div>

      <aside className="rater-verdict">
        <div className="verdict">
          <div className="verdict-row">
            <span>Song average<i>auto</i></span>
            <b>{songAverage === null ? '—' : songAverage.toFixed(1)}</b>
          </div>
          {CRITERIA.map(([key, label]) => (
            <label className="verdict-row" key={key}>
              <span>{label}</span>
              <input
                value={criteria[key] ?? ''}
                onChange={touch(e => setCriteria(c => ({ ...c, [key]: e.target.value })))}
                placeholder="—"
                inputMode="decimal"
                aria-label={label}
              />
            </label>
          ))}

          <div className="verdict-final">
            <span>Final</span>
            <strong
              className={`tnum${final === null ? ' is-empty' : ''}`}
              style={finalStyle(final)}
            >
              {final === null ? '—' : final.toFixed(1)}
            </strong>
          </div>

          <label className="verdict-override">
            <span>Override</span>
            <input
              value={override}
              onChange={touch(e => setOverride(e.target.value))}
              placeholder="—"
              inputMode="decimal"
              aria-label="Override the final score"
            />
          </label>

          {picks.length > 0 && (
            <div className="picks">
              {picks.map(p => {
                if (p.kind === 'trackId') {
                  return (
                    <label className="pick" key={p.key}>
                      <span>{p.label}</span>
                      <select value={nowPlaying} onChange={touch(e => setNowPlaying(e.target.value))}>
                        <option value="">Not chosen</option>
                        {album.tracks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                      </select>
                    </label>
                  )
                }
                if (p.kind === 'feature') {
                  // Only the guests actually credited on this record can be its
                  // best feature, so the list comes off the tracklist.
                  const guests = [...new Set(album.tracks.flatMap(t => t.features || []))]
                  return (
                    <label className="pick" key={p.key}>
                      <span>{p.label}</span>
                      <select value={selections[p.key] ?? ''} onChange={e => pick(p.key, e.target.value)}>
                        <option value="">{guests.length ? 'Not chosen' : 'No features on this record'}</option>
                        {guests.map(g => <option key={g} value={g}>{g}</option>)}
                      </select>
                    </label>
                  )
                }
                return (
                  <label className="pick" key={p.key}>
                    <span>{p.label}</span>
                    <select value={selections[p.key] ?? ''} onChange={e => pick(p.key, e.target.value)}>
                      <option value="">
                        {p.key === 'bestSong' && topScored ? `${topScored} (top score)` : 'Not chosen'}
                      </option>
                      {album.tracks.map(t => <option key={t.id} value={t.title}>{t.title}</option>)}
                    </select>
                  </label>
                )
              })}
            </div>
          )}

          <button
            className={`verdict-save is-${save.state}`}
            onClick={persist}
            disabled={!canSave || save.state === 'saving' || save.state === 'saved' || done === 0}
          >
            {label}
          </button>
          {save.state === 'saved' && (
            <a className="verdict-export" href={`/app/rate/${encodeURIComponent(album.id)}/export`}>
              Build the slides
              <svg viewBox="0 0 15 15" fill="none" aria-hidden="true">
                <path d="M3 7.5h9m0 0L8.5 4M12 7.5 8.5 11" stroke="currentColor"
                  strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
          )}
          {save.state === 'error' && <p className="verdict-error">{save.message}</p>}
          {!canSave && <p className="verdict-error">Sign in to save this.</p>}
        </div>
      </aside>
    </div>
  )
}
