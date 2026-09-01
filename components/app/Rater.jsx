'use client'

import { useEffect, useMemo, useState } from 'react'
import { usePlayer } from '../audio/Player'
import Meter from '../audio/Meter'
import { dominant } from '../../lib/palette'
import { ratingColor } from '../../lib/rating-colors'
import { NA } from '../../lib/rating-scale'
import { superlativeByKey, DEFAULT_PREFERENCES, SUPERLATIVE_MAX } from '../../lib/preferences'
import { DEFAULT_SCALE } from '../../lib/scales'
import ImageInput from './ImageInput'
import SuperlativePicker from './SuperlativePicker'
import { fmtTime } from '../../lib/music'
import { toSnapshot } from '../../lib/album-shape'

// Accepts 0-11, a decimal, or a dash for N/A. Anything else is simply ignored
// rather than bounced with an error, so typing never fights the user.
// Accepts 3:47, 227 or 1:02:33. Anything unreadable leaves the value alone
// rather than zeroing a duration somebody typed carefully.
function clockToSecs (text, fallback) {
  const t = String(text).trim()
  if (!t) return 0
  if (/^\d+$/.test(t)) return Number(t)
  const parts = t.split(':').map(x => x.trim())
  if (parts.some(x => !/^\d+$/.test(x))) return fallback
  return parts.reduce((acc, x) => acc * 60 + Number(x), 0)
}

function parseScore (raw, max, allowNA = true) {
  const s = String(raw).trim()
  if (s === '') return null
  if (s === '-' || s === '–' || s.toLowerCase() === 'n' || s.toLowerCase() === 'na') {
    return allowNA ? NA : undefined
  }
  const n = Number(s)
  if (!Number.isFinite(n)) return undefined
  return Math.min(max, Math.max(0, n))
}

// ratingColor returns { bg, fg }: bg may be a gradient, which is fine behind a
// chip but never as a text colour, so the headline number falls back to the
// room accent whenever its tier is a gradient.
const tierStyle = (v, scale) => {
  const c = ratingColor(v, scale)
  return { background: c.bg, color: c.fg, borderColor: 'transparent' }
}
const finalStyle = (v, scale) => {
  if (v === null) return undefined
  const c = ratingColor(Math.round(v), scale)
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
  const [editing, setEditing] = useState(false)
  useEffect(() => { setAlbum(source) }, [source])
  // The rater's own instrument, not a fixed five. Renaming one keeps its key,
  // so scores already filed under it stay attached.
  const editAlbum = next => { setAlbum(next); setSave({ state: 'idle', message: '' }) }

  // Track edits keep the runtime honest: a total that disagrees with the songs
  // above it is worse than no total.
  const editTrack = (id, patch) => editAlbum({
    ...album,
    tracks: album.tracks.map(t => (t.id === id ? { ...t, ...patch } : t)),
    runtime: album.tracks.reduce(
      (a, t) => a + Number(t.id === id && patch.duration !== undefined ? patch.duration : t.duration) || 0, 0)
  })

  // The scale is the rater's, so the ceiling, the tier names and the colours
  // all come from it rather than from a fixed 0 to 11.
  const scale = preferences.scale || DEFAULT_SCALE
  const MAX_SCORE = scale.max

  const CRITERIA = preferences.criteria.map(c => [c.key, c.label])

  // Which superlatives to hand out is a decision made while rating, not one to
  // go to a settings page for, so it is changed here and saved as it changes.
  const [supers, setSupers] = useState(preferences.superlatives)
  const [picksPanel, setPicksPanel] = useState(false)
  const picks = supers.map(k => superlativeByKey[k]).filter(Boolean)

  const toggleSuper = key => setSupers(prev => {
    const next = prev.includes(key)
      ? prev.filter(k => k !== key)
      : (prev.length >= SUPERLATIVE_MAX ? prev : [...prev, key])
    // Fire and forget: it is a preference, and blocking the checkbox on a
    // round trip would make ticking one feel broken.
    fetch('/api/preferences', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ criteria: preferences.criteria, superlatives: next })
    }).catch(() => {})
    return next
  })
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
    const v = parseScore(raw, MAX_SCORE, scale.na !== false)
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
          scaleModel: scale,
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
    <div className={`rater${editing ? ' editing' : ''}`}>
      <div className="rater-bar">
        <button
          className={`rater-mode${editing ? ' on' : ''}`}
          onClick={() => setEditing(v => !v)}
          aria-pressed={editing}
        >
          {editing
            ? <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5 10 17.5 19 7" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" /></svg>
            : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" /></svg>}
          {editing ? 'Done' : 'Edit'}
        </button>
        {editing && (
          <span className="rater-mode-note">
            Everything on this screen is yours to correct. Save when you are done.
          </span>
        )}
      </div>
      <div className="rater-bg" aria-hidden="true">
        <img src={album.cover} alt="" />
      </div>

      <aside className="rater-side">
        <div className="rater-art">
          {editing
            ? <ImageInput
                value={album.cover || ''}
                onChange={cover => editAlbum({ ...album, cover })}
                hint={`${album.artist || 'artist'}-${album.name || 'album'}`}
                label="Album cover"
              />
            : <img src={album.cover} alt="" />}
        </div>
        {editing ? (
          <div className="rater-edits">
            <label><span>Album</span>
              <input value={album.name || ''} onChange={e => editAlbum({ ...album, name: e.target.value })} />
            </label>
            <label><span>Artist</span>
              <input value={album.artist || ''} onChange={e => editAlbum({ ...album, artist: e.target.value })} />
            </label>
            <div className="rater-edits-pair">
              <label><span>Released</span>
                <input value={album.year || ''} inputMode="numeric"
                  onChange={e => editAlbum({ ...album, year: e.target.value })} />
              </label>
              <label><span>Genre</span>
                <input value={album.genre || ''} onChange={e => editAlbum({ ...album, genre: e.target.value })} />
              </label>
            </div>
          </div>
        ) : (
          <>
            <h1 className="rater-title">{album.name}</h1>
            <p className="rater-by">{album.artist}</p>
          </>
        )}
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


        <p className="rater-hint">
          0 to {MAX_SCORE}{scale.na ? ', or a dash for N/A' : ''}.
        </p>
      </aside>


      <button
        className={`set-scrim${picksPanel ? ' on' : ''}`}
        onClick={() => setPicksPanel(false)} aria-label="Close superlatives"
        tabIndex={picksPanel ? 0 : -1}
      />
      <aside className={`set${picksPanel ? ' open' : ''}`} aria-label="Superlatives" aria-hidden={!picksPanel}>
        <header className="set-head">
          <h2>Superlatives</h2>
          <button onClick={() => setPicksPanel(false)} aria-label="Close superlatives">
            <svg viewBox="0 0 24 24"><path d="M6.5 6.5l11 11m0-11l-11 11" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </header>
        <div className="set-body">
          <p className="ad-note">
            The picks you hand out on this and every album. Turning one off takes it off the
            rating screen and off the exported slides.
          </p>
          <SuperlativePicker chosen={supers} onToggle={toggleSuper} />
        </div>
      </aside>

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

                {editing ? (
                  <span className="trk-name trk-edit">
                    <input
                      value={t.title || ''}
                      onChange={e => editTrack(t.id, { title: e.target.value })}
                      placeholder="Song title" aria-label={`Title of track ${t.n}`}
                    />
                    <input
                      className="trk-ft"
                      value={(t.features || []).join(', ')}
                      onChange={e => editTrack(t.id, {
                        features: e.target.value.split(',').map(x => x.trim()).filter(Boolean)
                      })}
                      placeholder="Features, separated by commas"
                      aria-label={`Features on track ${t.n}`}
                    />
                  </span>
                ) : (
                  <span className="trk-name">
                    <strong>{t.title}</strong>
                    {t.features.length > 0 && <em>ft. {t.features.join(', ')}</em>}
                  </span>
                )}

                {editing
                  ? <input
                      className="trk-len tnum" defaultValue={fmtTime(t.duration)}
                      onBlur={e => {
                        const secs = clockToSecs(e.target.value, t.duration)
                        e.target.value = fmtTime(secs)
                        editTrack(t.id, { duration: secs })
                      }}
                      aria-label={`Length of track ${t.n}`}
                    />
                  : on && playing
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
                  style={has ? tierStyle(v, scale) : undefined}
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
              style={finalStyle(final, scale)}
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

          <div className="picks-head">
            <span>Superlatives</span>
            <button onClick={() => setPicksPanel(true)}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 6h16M7 12h10M10 18h4" fill="none" stroke="currentColor"
                  strokeWidth="1.9" strokeLinecap="round" />
              </svg>
              Choose
            </button>
          </div>

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
