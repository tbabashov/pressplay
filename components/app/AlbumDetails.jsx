'use client'

import { useState } from 'react'

// PRODUCT.md: every database-sourced field must be editable, including track
// durations, and nothing may be silently derived where the user would disagree.
// The catalogues get plenty wrong: missing features, deluxe track lists, the
// wrong year, a compilation cover. This is where that gets corrected.
//
// Edits land on the review's own album snapshot, so a correction survives the
// catalogue changing its mind and travels with the review to its public page
// and its exported slides.

const secsToClock = s => {
  const n = Math.max(0, Math.round(Number(s) || 0))
  return `${Math.floor(n / 60)}:${String(n % 60).padStart(2, '0')}`
}

// Accepts 3:47, 227, or 1:02:33. Anything unreadable leaves the value alone
// rather than silently zeroing a duration someone typed carefully.
const clockToSecs = (text, fallback) => {
  const t = String(text).trim()
  if (!t) return 0
  if (/^\d+$/.test(t)) return Number(t)
  const parts = t.split(':').map(p => p.trim())
  if (parts.some(p => !/^\d+$/.test(p))) return fallback
  return parts.reduce((acc, p) => acc * 60 + Number(p), 0)
}

export default function AlbumDetails ({ album, onChange, onClose, open }) {
  const [confirmDrop, setConfirmDrop] = useState(null)

  const setAlbum = patch => onChange({ ...album, ...patch })

  const setTrack = (id, patch) => onChange({
    ...album,
    tracks: album.tracks.map(t => (t.id === id ? { ...t, ...patch } : t))
  })

  // Runtime follows the tracks unless it has been typed over, because a total
  // that disagrees with the songs above it is worse than no total.
  const retime = tracks => ({
    tracks,
    runtime: tracks.reduce((a, t) => a + (Number(t.duration) || 0), 0)
  })

  const addTrack = () => {
    const n = album.tracks.length + 1
    const tracks = [...album.tracks, {
      id: `extra:${Date.now()}`, n, title: '', duration: 0, features: [], preview: false
    }]
    onChange({ ...album, ...retime(tracks) })
  }

  const dropTrack = id => {
    const tracks = album.tracks.filter(t => t.id !== id).map((t, i) => ({ ...t, n: i + 1 }))
    onChange({ ...album, ...retime(tracks) })
    setConfirmDrop(null)
  }

  return (
    <>
      <button
        className={`set-scrim${open ? ' on' : ''}`}
        onClick={onClose} aria-label="Close details" tabIndex={open ? 0 : -1}
      />
      <aside className={`set ad${open ? ' open' : ''}`} aria-label="Album details" aria-hidden={!open}>
        <header className="set-head">
          <h2>Details</h2>
          <button onClick={onClose} aria-label="Close details">
            <svg viewBox="0 0 24 24"><path d="M6.5 6.5l11 11m0-11l-11 11" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </header>

        <div className="set-body">
          <p className="ad-note">
            Correcting anything here changes it for your review only, and it stays corrected
            whatever the catalogue does next.
          </p>

          <section className="ad-album">
            <label className="ad-cover">
              <img src={album.cover || ''} alt="" />
              <span>Cover</span>
            </label>
            <div className="ad-fields">
              <label><span>Cover image URL</span>
                <input value={album.cover || ''} onChange={e => setAlbum({ cover: e.target.value })}
                  placeholder="https://…" spellCheck={false} />
              </label>
              <label><span>Album</span>
                <input value={album.name || ''} onChange={e => setAlbum({ name: e.target.value })} />
              </label>
              <label><span>Artist</span>
                <input value={album.artist || ''} onChange={e => setAlbum({ artist: e.target.value })} />
              </label>
              <div className="ad-pair">
                <label><span>Released</span>
                  <input value={album.year || ''} onChange={e => setAlbum({ year: e.target.value })}
                    inputMode="numeric" placeholder="1998" />
                </label>
                <label><span>Genre</span>
                  <input value={album.genre || ''} onChange={e => setAlbum({ genre: e.target.value })} />
                </label>
              </div>
              <label><span>Runtime</span>
                <input
                  value={secsToClock(album.runtime)}
                  onChange={e => setAlbum({ runtime: clockToSecs(e.target.value, album.runtime) })}
                />
                <em>Adds itself up from the songs. Type over it if the catalogue is wrong.</em>
              </label>
            </div>
          </section>

          <section>
            <h3>Songs</h3>
            <ol className="ad-tracks">
              {album.tracks.map(t => (
                <li key={t.id}>
                  <span className="ad-n tnum">{t.n}</span>
                  <div className="ad-track">
                    <input
                      className="ad-title" value={t.title || ''}
                      onChange={e => setTrack(t.id, { title: e.target.value })}
                      placeholder="Song title"
                    />
                    <input
                      className="ad-ft" value={(t.features || []).join(', ')}
                      onChange={e => setTrack(t.id, {
                        features: e.target.value.split(',').map(x => x.trim()).filter(Boolean)
                      })}
                      placeholder="Features, separated by commas"
                    />
                  </div>
                  <input
                    className="ad-len tnum" defaultValue={secsToClock(t.duration)}
                    onBlur={e => {
                      const secs = clockToSecs(e.target.value, t.duration)
                      e.target.value = secsToClock(secs)
                      const tracks = album.tracks.map(x => (x.id === t.id ? { ...x, duration: secs } : x))
                      onChange({ ...album, ...retime(tracks) })
                    }}
                    aria-label={`Length of ${t.title || 'this song'}`}
                  />
                  <button
                    className="ad-x"
                    onClick={() => (confirmDrop === t.id ? dropTrack(t.id) : setConfirmDrop(t.id))}
                    aria-label={`Remove ${t.title || 'this song'}`}
                  >
                    {confirmDrop === t.id ? 'Sure?' : (
                      <svg viewBox="0 0 24 24"><path d="M6.5 6.5l11 11m0-11l-11 11" fill="none"
                        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
                    )}
                  </button>
                </li>
              ))}
            </ol>
            <button className="rm-add" onClick={addTrack}>Add a song</button>
          </section>
        </div>
      </aside>
    </>
  )
}
