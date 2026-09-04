'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { usePlayer } from '../audio/Player'
import Meter from '../audio/Meter'
import { dominant } from '../../lib/palette'
import { chipColour } from '../../lib/rating-colors'
import { autoBestSong, autoWorstSong } from '../../lib/auto-picks'
import { NA } from '../../lib/rating-scale'
import { superlativeByKey, DEFAULT_PREFERENCES, SUPERLATIVE_MAX, TEXT_SUPERLATIVE_MAX } from '../../lib/preferences'
import { DEFAULT_SCALE } from '../../lib/scales'
import ImageInput from './ImageInput'
import SuperlativePicker from './SuperlativePicker'
import FeatureInput from './FeatureInput'
import { fmtTime } from '../../lib/music'
import { toSnapshot } from '../../lib/album-shape'
import { artUrl } from '../../app/api/art/shared.js'

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

// chipColour returns { bg, fg }: bg may be a gradient, which is fine behind a
// chip but never as a text colour, so the headline number falls back to the
// room accent whenever its tier is a gradient.
const tierStyle = (v, scale) => {
  const c = chipColour(v, scale)
  return {
    background: c.bg,
    color: c.fg,
    borderColor: 'transparent',
    // The top of the ladder carries a halo everywhere else it is drawn: the
    // leaderboard, the library, the final rating. The one place you actually
    // give the score was the one place it did not.
    boxShadow: c.glow ? `0 0 20px ${c.glow}` : undefined
  }
}
const finalStyle = (v, scale) => {
  if (v === null) return undefined
  const c = chipColour(Math.round(v), scale)
  return {
    background: c.bg,
    color: c.fg,
    boxShadow: c.glow ? `0 0 46px ${c.glow}` : 'none'
  }
}

// Same-origin so the canvas can read it.
// The target rides in the path; see app/api/art/[key]/route.js for why.
const proxied = url => (url ? artUrl(url) : null)

export default function Rater ({ album: source, initial = null, canSave = true, preferences = DEFAULT_PREFERENCES }) {
  // The album is editable, so it is state rather than a prop read straight
  // through. Corrections are saved on the review's own snapshot with everything
  // else, which is why they survive the catalogue changing underneath.
  const router = useRouter()
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
  const [confirmDrop, setConfirmDrop] = useState(null)

  // A song the catalogue does not have, and a song it has that this record
  // does not. Both renumber what is left and re-total the runtime, because a
  // list that skips 7 or a total that disagrees with its songs reads as broken.
  const retime = tracks => ({
    tracks: tracks.map((t, i) => ({ ...t, n: i + 1 })),
    runtime: tracks.reduce((a, t) => a + (Number(t.duration) || 0), 0)
  })

  // Built from the previous album rather than the one this render closed over.
  // Three quick clicks on Add a song all computed from the same starting list
  // and the last write won, so two of the three songs never appeared.
  const patchAlbum = fn => {
    setAlbum(prev => fn(prev))
    setSave(st => (st.state === 'saved' ? { state: 'idle', message: '' } : st))
  }

  const addTrack = () => patchAlbum(prev => ({
    ...prev,
    ...retime([...prev.tracks, {
      // Not a catalogue id: this song exists only on this review, and the
      // preview route has nothing to play for it. The random tail is because
      // two quick clicks land in the same millisecond, and this id keys both
      // the list and the scores — a collision would score two rows at once.
      id: `extra:${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      n: prev.tracks.length + 1,
      title: '', duration: 0, features: [], preview: false
    }])
  }))

  const dropTrack = id => {
    patchAlbum(prev => ({ ...prev, ...retime(prev.tracks.filter(t => t.id !== id)) }))
    // The score goes with the song. Left behind it keeps counting towards the
    // song average for a track that is no longer on the record.
    setScores(sc => { const { [id]: _, ...rest } = sc; return rest })
    // And so does anything else pointing at it.
    const gone = album.tracks.find(t => t.id === id)
    if (nowPlaying === id) setNowPlaying('')
    if (gone?.title) {
      setSelections(sel => {
        const next = { ...sel }
        for (const k of ['bestSong', 'worstSong']) {
          // Back to automatic rather than naming a song that is not there.
          if (next[k] === gone.title) next[k] = ''
        }
        return next
      })
    }
    setConfirmDrop(null)
  }
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
  //
  // A criterion is typed freely rather than parsed on the keystroke, so until
  // it is read it can be anything: 10.6 on a ten scale, 50, or -3. Songs have
  // always been clamped on the way in and criteria never were, which is how a
  // final could land above the ceiling the whole screen is drawn against — a
  // 50 in one box put the album at 16.1 out of 10. Clamped here rather than
  // while typing, so a two-digit score is still typeable a digit at a time.
  const parts = useMemo(() => {
    const clamp = v => Math.min(MAX_SCORE, Math.max(0, v))
    const p = []
    if (songAverage !== null) p.push(songAverage)
    for (const [key] of CRITERIA) {
      const n = Number(criteria[key])
      if (criteria[key] !== '' && criteria[key] !== undefined && Number.isFinite(n)) p.push(clamp(n))
    }
    return p
  }, [songAverage, criteria, MAX_SCORE])

  const computed = parts.length ? parts.reduce((a, b) => a + b, 0) / parts.length : null
  const manual = override.trim() === '' ? null : Number(override)
  // An override is a deliberate number, but it is still a score on this scale.
  const final = Number.isFinite(manual) ? Math.min(MAX_SCORE, Math.max(0, manual)) : computed

  // Show what is counted. Without this the box keeps saying 50 while the score
  // is worked out from 10, which reads as the arithmetic being broken.
  const settle = (value, apply) => {
    const n = Number(value)
    if (String(value).trim() === '' || !Number.isFinite(n)) return
    const c = Math.min(MAX_SCORE, Math.max(0, n))
    if (c !== n) apply(String(c))
  }

  const done = Object.keys(scores).length
  // What the two automatic picks would come out as, for the empty option. The
  // same functions the slides and the public page resolve with, so what is
  // promised here is exactly what gets drawn.
  const autoPick = useMemo(() => ({
    bestSong: autoBestSong(scores, album.tracks),
    worstSong: autoWorstSong(scores, album.tracks)
  }), [scores, album.tracks])

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
      // The publish control is rendered by the server component beside this
      // one, and only once a review exists. Saving through fetch does not make
      // the server render again, so on a first rating the button stayed missing
      // until you navigated away and came back. This asks for that render.
      router.refresh()
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
                    <FeatureInput
                      value={t.features || []}
                      onChange={features => editTrack(t.id, { features })}
                      label={`Features on track ${t.n}`}
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
                  className={`trk-score${has ? ' is-scored' : ''}`}
                  value={v === NA ? '–' : v ?? ''}
                  onChange={e => setScore(t.id, e.target.value)}
                  placeholder=""
                  title="0 to 11, or a dash for N/A"
                  inputMode="decimal"
                  aria-label={`Score for ${t.title}`}
                  style={has ? tierStyle(v, scale) : undefined}
                />

                {/* Two taps, because the score goes with the song and there is
                    no undo for that. */}
                {editing && (
                  <button
                    className={`trk-drop${confirmDrop === t.id ? ' sure' : ''}`}
                    onClick={() => (confirmDrop === t.id ? dropTrack(t.id) : setConfirmDrop(t.id))}
                    onBlur={() => setConfirmDrop(c => (c === t.id ? null : c))}
                    aria-label={confirmDrop === t.id
                      ? `Confirm removing ${t.title || 'this song'}`
                      : `Remove ${t.title || 'this song'}`}
                  >
                    {confirmDrop === t.id
                      ? 'Sure?'
                      : <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6.5l11 11m0-11l-11 11"
                          fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>}
                  </button>
                )}
              </li>
            )
          })}
        </ol>
        {editing && (
          <button className="rm-add trk-add" onClick={addTrack}>Add a song</button>
        )}
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
                onBlur={e => settle(e.target.value, v => setCriteria(c => ({ ...c, [key]: v })))}
                placeholder="—"
                inputMode="decimal"
                aria-label={label}
              />
            </label>
          ))}

          {/* The criteria above and the scale the songs are given are both
              editable, and both used to be findable only at the bottom of the
              profile screen. The place to say so is here, where somebody is
              looking at the ones they were handed. */}
          <Link className="verdict-model" href="/app/scoring">
            {/* The same ladder mark the rail uses for scoring, so the button and
                the place it goes are recognisably the same thing. */}
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 5h16v2.6H4Zm0 5.7h11.4v2.6H4Zm0 5.7h6.8v2.6H4Z" />
            </svg>
            Change your criteria and scale
          </Link>

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
              onBlur={e => settle(e.target.value, setOverride)}
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
                if (p.kind === 'text') {
                  const said = selections[p.key] ?? ''
                  return (
                    <label className="pick pick-text" key={p.key}>
                      <span>{p.label}</span>
                      <textarea
                        value={said}
                        onChange={e => pick(p.key, e.target.value.slice(0, TEXT_SUPERLATIVE_MAX))}
                        maxLength={TEXT_SUPERLATIVE_MAX}
                        rows={3}
                        placeholder="What did you actually think of it?"
                      />
                      {/* Only once it is close enough to matter. A counter on an
                          empty box is noise about a limit nobody is near. */}
                      {said.length > TEXT_SUPERLATIVE_MAX - 120 && (
                        <em className="pick-count">
                          {TEXT_SUPERLATIVE_MAX - said.length} characters left
                        </em>
                      )}
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
                        {p.key === 'bestSong' && autoPick.bestSong
                          ? `${autoPick.bestSong} (top score)`
                          : p.key === 'worstSong' && autoPick.worstSong
                            ? `${autoPick.worstSong} (lowest score)`
                            : 'Not chosen'}
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
