'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ImageInput from './ImageInput'

const list = s => String(s || '').split(',').map(x => x.trim()).filter(Boolean)
const blankTrack = () => ({ key: Math.random().toString(36).slice(2), title: '', features: '', mins: '', secs: '' })

export default function AlbumBuilder ({ open, onClose, initialName = '' }) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [artists, setArtists] = useState('')
  const [year, setYear] = useState('')
  const [genre, setGenre] = useState('')
  const [cover, setCover] = useState(null)
  const [tracks, setTracks] = useState([blankTrack(), blankTrack(), blankTrack()])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // The panel stays mounted, so seed the name each time it opens.
  useEffect(() => {
    if (open && initialName && !name.trim()) setName(initialName)
  }, [open, initialName])

  const patch = (i, p) => setTracks(t => t.map((x, j) => (j === i ? { ...x, ...p } : x)))
  const named = tracks.filter(t => t.title.trim())
  const ready = name.trim() && artists.trim() && named.length > 0

  const save = async () => {
    setError(''); setBusy(true)
    try {
      const id = `custom:${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`
      const snapshot = {
        id,
        name: name.trim(),
        artists: list(artists),
        cover: cover || null,
        year: year.trim() || null,
        genre: genre.trim() || null,
        runtimeMs: named.reduce((n, t) => n + ((+t.mins || 0) * 60 + (+t.secs || 0)) * 1000, 0),
        tracks: named.map((t, i) => ({
          id: `${id}:${i + 1}`,
          name: t.title.trim(),
          features: list(t.features),
          trackNumber: i + 1,
          durationMs: ((+t.mins || 0) * 60 + (+t.secs || 0)) * 1000
        }))
      }
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          albumId: id,
          albumName: snapshot.name,
          artist: snapshot.artists.join(', '),
          cover: snapshot.cover,
          year: snapshot.year,
          album: snapshot,
          scores: {},
          criteria: {}
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'That did not save.')
      router.push(`/app/rate/${encodeURIComponent(id)}`)
    } catch (e) {
      setError(e.message)
      setBusy(false)
    }
  }

  return (
    <>
      <div className={`set-scrim${open ? ' show' : ''}`} onClick={onClose} aria-hidden="true" />
      <aside className={`set${open ? ' open' : ''}`} aria-label="Add an album" aria-hidden={!open}>
        <header className="set-head">
          <h2>Add an album</h2>
          <button onClick={onClose} aria-label="Close">
            <svg viewBox="0 0 24 24"><path d="M6.5 6.5l11 11m0-11l-11 11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
          </button>
        </header>

        <div className="set-body ab">
          <label className="ab-field">
            <span>Album</span>
            <input value={name} onChange={e => setName(e.target.value)} maxLength={120} placeholder="Album name" />
          </label>

          <label className="ab-field">
            <span>Artists</span>
            <input value={artists} onChange={e => setArtists(e.target.value)} maxLength={160}
              placeholder="One name, or several separated by commas" />
          </label>

          <div className="ab-pair">
            <label className="ab-field">
              <span>Year</span>
              <input value={year} onChange={e => setYear(e.target.value)} inputMode="numeric" maxLength={4} placeholder="2026" />
            </label>
            <label className="ab-field">
              <span>Genre</span>
              <input value={genre} onChange={e => setGenre(e.target.value)} maxLength={40} placeholder="Hip-Hop/Rap" />
            </label>
          </div>

          <div className="ab-field">
            <span>Cover</span>
            <ImageInput value={cover} onChange={setCover} hint="cover" label="Cover" />
          </div>

          <div className="ab-tracks">
            <span className="ab-label">Songs</span>
            {tracks.map((t, i) => (
              <div className="ab-track" key={t.key}>
                <em>{i + 1}</em>
                <input value={t.title} onChange={e => patch(i, { title: e.target.value })}
                  maxLength={140} placeholder="Song title" />
                <input value={t.features} onChange={e => patch(i, { features: e.target.value })}
                  maxLength={140} placeholder="Features, comma separated" />
                <input value={t.mins} onChange={e => patch(i, { mins: e.target.value.replace(/\D/g, '') })}
                  inputMode="numeric" maxLength={3} placeholder="m" aria-label={`Minutes for song ${i + 1}`} />
                <input value={t.secs} onChange={e => patch(i, { secs: e.target.value.replace(/\D/g, '') })}
                  inputMode="numeric" maxLength={2} placeholder="s" aria-label={`Seconds for song ${i + 1}`} />
                <button type="button" onClick={() => setTracks(x => x.filter((_, j) => j !== i))}
                  aria-label={`Remove song ${i + 1}`} disabled={tracks.length === 1}>×</button>
              </div>
            ))}
            <button type="button" className="ab-add" onClick={() => setTracks(t => [...t, blankTrack()])}>
              Add a song
            </button>
          </div>

          {error && <p className="notice notice-bad">{error}</p>}

          <div className="ab-do">
            <button className="btn-primary" onClick={save} disabled={!ready || busy}>
              {busy ? 'Saving…' : 'Create and rate it'}
            </button>
            {!ready && <span className="ab-hint">Needs a name, an artist and at least one song.</span>}
          </div>
        </div>
      </aside>
    </>
  )
}
