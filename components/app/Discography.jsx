'use client'

import { useMemo, useState } from 'react'
import ImageInput from './ImageInput'
import FeatureInput from './FeatureInput'
import { albumKey } from '@/lib/preferences'

const blank = { name: '', year: '', cover: '', artists: [] }

export default function Discography ({ initial, artists, catalogue = [], hidden = [], rated = [] }) {
  const [entries, setEntries] = useState(initial)
  const [hiddenKeys, setHiddenKeys] = useState(hidden)
  const [showHidden, setShowHidden] = useState(false)
  const [form, setForm] = useState(blank)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const hiddenSet = useMemo(() => new Set(hiddenKeys), [hiddenKeys])
  const ratedSet = useMemo(
    () => new Set(rated.map(r => albumKey(r.artist, r.name))), [rated])

  // Typed-in albums and catalogue albums land in the same artist group, because
  // that is how they land on a slide. Where both have the same title the typed
  // one wins, so a cover you uploaded is not shadowed by the catalogue's.
  const byArtist = useMemo(() => {
    const map = new Map()
    const group = a => {
      const k = a.toLowerCase()
      if (!map.has(k)) map.set(k, { artist: a, albums: [], hidden: [] })
      return map.get(k)
    }
    for (const e of entries) for (const a of e.artists) group(a).albums.push({ ...e, source: 'manual' })

    for (const { artist, albums } of catalogue) {
      const g = group(artist)
      const taken = new Set(g.albums.map(a => albumKey(artist, a.name)))
      for (const a of albums) {
        const key = albumKey(artist, a.name)
        if (taken.has(key)) continue
        taken.add(key)
        const row = { id: `auto:${a.id}`, key, name: a.name, year: a.year, cover: a.cover,
          artists: [artist], source: ratedSet.has(key) ? 'rated' : 'auto' }
        ;(hiddenSet.has(key) ? g.hidden : g.albums).push(row)
      }
    }
    for (const g of map.values()) {
      g.albums.sort((a, b) => String(b.year || '').localeCompare(String(a.year || '')))
    }
    return [...map.values()].sort((a, b) => a.artist.localeCompare(b.artist))
  }, [entries, catalogue, hiddenSet, ratedSet])

  const hiddenCount = useMemo(
    () => byArtist.reduce((n, g) => n + g.hidden.length, 0), [byArtist])

  // Hiding is a preference, not a delete: the album still exists in the
  // catalogue, we just stop putting it on slides, and it can be put back.
  const setHidden = async next => {
    const before = hiddenKeys
    setHiddenKeys(next)
    const res = await fetch('/api/preferences', {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ hiddenAlbums: next })
    })
    if (!res.ok) { setHiddenKeys(before); setError('Could not save that.') }
  }

  const hide = key => setHidden([...hiddenKeys.filter(k => k !== key), key])
  const unhide = key => setHidden(hiddenKeys.filter(k => k !== key))

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
          artists: form.artists
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
          <div className="wide">
            <span className="disc-label">Credited to</span>
            {/* Not a comma separated box. Typing Tyler, The Creator into one
                produced two artists called Tyler and The Creator, and the
                grouped list then rendered the second as "with The Creator". */}
            <FeatureInput
              value={form.artists}
              onChange={a => setForm({ ...form, artists: a })}
              label="Add an artist"
            />
          </div>
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

      {hiddenCount > 0 && (
        <button type="button" className="disc-toggle" onClick={() => setShowHidden(v => !v)}>
          {showHidden ? 'Hide' : 'Show'} {hiddenCount} removed {hiddenCount === 1 ? 'album' : 'albums'}
        </button>
      )}

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
                    {a.source !== 'manual' && (
                      <span className={`disc-tag${a.source === 'rated' ? ' is-rated' : ''}`}>
                        {a.source === 'rated' ? 'rated' : 'catalogue'}
                      </span>
                    )}
                    {a.source === 'rated' ? (
                      <span className="disc-locked" title="Remove this from your library to drop it" />
                    ) : (
                      <button
                        onClick={() => (a.source === 'auto' ? hide(a.key) : drop(a.id))}
                        aria-label={`Remove ${a.name}`}>
                        <svg viewBox="0 0 24 24"><path d="M6.5 6.5l11 11m0-11l-11 11" fill="none"
                          stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              {g.hidden.length > 0 && showHidden && (
                <ul className="glass-list disc-hidden">
                  {g.hidden.map(a => (
                    <li key={a.id}>
                      {a.cover
                        ? <img src={a.cover} alt="" loading="lazy" />
                        : <span className="disc-blank" aria-hidden="true" />}
                      <span className="disc-id">
                        <strong>{a.name}</strong>
                        {a.year && <em>{a.year}</em>}
                      </span>
                      <button onClick={() => unhide(a.key)} aria-label={`Put ${a.name} back`}>
                        <svg viewBox="0 0 24 24"><path d="M4 12h13m-5-5l5 5-5 5" fill="none"
                          stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"
                          strokeLinejoin="round" /></svg>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </>
  )
}
