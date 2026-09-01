'use client'

import { useMemo, useState } from 'react'
import ImageInput from './ImageInput'

const blank = { name: '', year: '', cover: '', artists: '' }

export default function Discography ({ initial, artists }) {
  const [entries, setEntries] = useState(initial)
  const [form, setForm] = useState(blank)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const byArtist = useMemo(() => {
    const map = new Map()
    for (const e of entries) {
      for (const a of e.artists) {
        const k = a.toLowerCase()
        if (!map.has(k)) map.set(k, { artist: a, albums: [] })
        map.get(k).albums.push(e)
      }
    }
    return [...map.values()].sort((a, b) => a.artist.localeCompare(b.artist))
  }, [entries])

  const add = async e => {
    e.preventDefault()
    setBusy(true); setError('')
    try {
      const res = await fetch('/api/discography', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          year: form.year,
          cover: form.cover,
          artists: form.artists.split(',').map(s => s.trim()).filter(Boolean)
        })
      })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error || 'Could not save it.')
      setEntries(list => [...list, body.entry])
      setForm(blank)
    } catch (err) { setError(err.message) } finally { setBusy(false) }
  }

  const drop = async id => {
    const before = entries
    setEntries(list => list.filter(e => e.id !== id))
    const res = await fetch(`/api/discography/${encodeURIComponent(id)}`, { method: 'DELETE' })
    if (!res.ok) { setEntries(before); setError('Could not remove it.') }
  }

  return (
    <>
      <form className="disc-form" onSubmit={add}>
        <div className="disc-fields">
          <label>
            <span>Album</span>
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
              placeholder="Album name" required />
          </label>
          <label>
            <span>Year</span>
            <input value={form.year} onChange={e => setForm({ ...form, year: e.target.value })}
              placeholder="1998" inputMode="numeric" />
          </label>
          <label className="wide">
            <span>Credited to</span>
            <input value={form.artists} onChange={e => setForm({ ...form, artists: e.target.value })}
              placeholder="Separate several artists with commas" required
              list="known-artists" />
            <datalist id="known-artists">
              {artists.map(a => <option key={a} value={a} />)}
            </datalist>
          </label>
          <div className="wide disc-cover">
            <span>Cover</span>
            <ImageInput
              value={form.cover}
              onChange={cover => setForm({ ...form, cover })}
              hint={`${form.artists || 'artist'}-${form.name || 'album'}`}
              label="Album cover"
            />
          </div>
        </div>
        <button className="btn-primary" disabled={busy}>{busy ? 'Adding…' : 'Add album'}</button>
        {error && <p className="cut-error">{error}</p>}
      </form>

      {byArtist.length === 0 ? (
        <p className="notice">
          Nothing typed in yet. Anything you add here shows as an unrated tile on that artist’s
          discography slide.
        </p>
      ) : (
        <div className="disc-groups">
          {byArtist.map(g => (
            <section key={g.artist}>
              <h2>{g.artist}<em>{g.albums.length}</em></h2>
              <ul className="glass-list">
                {g.albums.map(a => (
                  <li key={a.id}>
                    {a.cover
                      ? <img src={a.cover} alt="" loading="lazy" />
                      : <span className="disc-blank" aria-hidden="true" />}
                    <span className="disc-id">
                      <strong>{a.name}</strong>
                      {a.year && <em>{a.year}</em>}
                      {a.artists.length > 1 && <i>with {a.artists.filter(x => x !== g.artist).join(', ')}</i>}
                    </span>
                    <button onClick={() => drop(a.id)} aria-label={`Remove ${a.name}`}>
                      <svg viewBox="0 0 24 24"><path d="M6.5 6.5l11 11m0-11l-11 11" fill="none"
                        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  )
}
