import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, proxyImg } from '../api.js'
import { ratingColor } from '../colors.js'
import { fmtScore } from '../rating.js'

const BLANK = { name: '', artists: '', year: '', cover: null }

// Covers here only ever render at ~245px in a frame, so 600px is plenty and
// keeps db.json from ballooning once a few dozen albums are entered.
function readCover (file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const size = Math.min(600, Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      const s = Math.max(size / img.width, size / img.height)
      ctx.drawImage(img, (size - img.width * s) / 2, (size - img.height * s) / 2, img.width * s, img.height * s)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.86))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read that image')) }
    img.src = url
  })
}

export default function Discography () {
  const nav = useNavigate()
  const [artists, setArtists] = useState([])
  const [artist, setArtist] = useState('')
  const [albums, setAlbums] = useState([])
  const [draft, setDraft] = useState(BLANK)
  const [editingId, setEditingId] = useState(null)
  const [newArtist, setNewArtist] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)

  useEffect(() => { loadArtists() }, [])
  useEffect(() => { if (artist) loadAlbums(artist) }, [artist])

  async function loadArtists () {
    try {
      const d = await api.discography()
      setArtists(d.artists)
      setArtist(a => a || d.artists[0]?.artist || '')
    } catch (e) { setErr(e.message) }
  }

  async function loadAlbums (name) {
    try {
      setAlbums((await api.artistDiscography(name)).albums)
    } catch (e) { setErr(e.message) }
  }

  async function onCoverFile (e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      setDraft(d => ({ ...d, cover: null }))
      const cover = await readCover(file)
      setDraft(d => ({ ...d, cover }))
    } catch (e2) { setErr(e2.message) }
  }

  async function saveDraft () {
    if (!artist || !draft.name.trim()) { setErr('Pick an artist and type an album name'); return }
    setBusy(true)
    setErr('')
    try {
      await api.saveDiscographyEntry(editingId || `disc:${Date.now()}`, {
        artist,
        name: draft.name.trim(),
        artists: draft.artists.split(',').map(s => s.trim()).filter(Boolean),
        year: draft.year.trim() || null,
        cover: draft.cover
      })
      setDraft(BLANK)
      setEditingId(null)
      await loadAlbums(artist)
      await loadArtists()
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  function editEntry (a) {
    setEditingId(a.key)
    setDraft({
      name: a.name,
      artists: (a.artists || []).join(', '),
      year: a.year || '',
      cover: a.cover || null
    })
  }

  async function removeEntry (a) {
    // one stored record serves every credited artist, so removing it here
    // removes it from all of their discographies
    const shared = (a.artists || []).length > 1
    const msg = shared
      ? `Remove "${a.name}"? It's credited to ${a.artists.join(', ')}, so it disappears from all of their discographies.`
      : `Remove "${a.name}" from ${artist}'s discography?`
    if (!window.confirm(msg)) return
    try {
      await api.deleteDiscographyEntry(a.key)
      if (editingId === a.key) { setEditingId(null); setDraft(BLANK) }
      await loadAlbums(artist)
    } catch (e) { setErr(e.message) }
  }

  const ratedCount = albums.filter(a => a.rated).length

  return (
    <div className="app" style={{ maxWidth: 860 }}>
      <div className="nav">
        <h1>Discographies</h1>
        <div className="links">
          <button className="pill" onClick={() => nav('/update')}>Leaderboard Update</button>
          <button className="pill" onClick={() => nav('/')}>‹ Home</button>
        </div>
      </div>

      <div className="muted" style={{ padding: '0 0 16px' }}>
        Rated albums are pulled straight from your own rankings. Everything an artist
        released that you haven&rsquo;t rated yet gets typed in here — nothing is ever
        fetched from iTunes or Discogs.
      </div>

      {err && <div className="err" style={{ marginBottom: 12 }}>{err}</div>}

      <div className="field" style={{ maxWidth: 420 }}>
        <label>Artist</label>
        <select value={artist} onChange={e => { setArtist(e.target.value); setDraft(BLANK); setEditingId(null) }}>
          {artists.map(a => (
            <option key={a.artist} value={a.artist}>{a.artist} ({a.ratedCount} rated)</option>
          ))}
        </select>
      </div>

      <div className="disco-newartist">
        <input
          placeholder="…or add an artist you haven't rated at all"
          value={newArtist}
          onChange={e => setNewArtist(e.target.value)}
          onKeyDown={e => {
            if (e.key !== 'Enter' || !newArtist.trim()) return
            const name = newArtist.trim()
            setArtists(prev => prev.some(a => a.artist.toLowerCase() === name.toLowerCase())
              ? prev
              : [...prev, { artist: name, ratedCount: 0 }].sort((a, b) => a.artist.localeCompare(b.artist)))
            setArtist(name)
            setNewArtist('')
          }}
        />
      </div>

      {artist && (
        <>
          <div className="section-title">
            {artist} · {ratedCount} of {albums.length} rated
          </div>
          <div className="card">
            {albums.length === 0 && <div className="muted" style={{ padding: 0 }}>Nothing yet — add their albums below.</div>}
            {albums.map(a => {
              const c = ratingColor(a.rated ? Math.round(a.rating) : null)
              return (
                <div key={a.key} className="album-row" style={{ cursor: 'default' }}>
                  {a.cover
                    ? <img src={a.cover.startsWith('data:') ? a.cover : proxyImg(a.cover)} alt="" style={a.rated ? {} : { opacity: 0.35, filter: 'grayscale(1)' }} />
                    : <div className="disco-nocover">?</div>}
                  <div className="meta">
                    <div className="title">{a.name}</div>
                    <div className="sub">
                      {[(a.artists || []).join(', '), a.year].filter(Boolean).join(' · ')}
                      {!a.rated && (
                        <span className="src-badge">
                          {a.owner && a.owner.toLowerCase() !== artist.toLowerCase()
                            ? `via ${a.owner}`
                            : 'not rated'}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="score-chip" style={{ background: c.bg, color: c.fg }}>
                    {a.rated ? fmtScore(a.rating) : '?'}
                  </span>
                  {!a.rated && (
                    <>
                      <button
                        className="pill" style={{ padding: '6px 12px', fontSize: 13 }}
                        onClick={() => editEntry(a)}
                      >Edit</button>
                      <button className="row-delete" title="Remove" onClick={() => removeEntry(a)}>✕</button>
                    </>
                  )}
                </div>
              )
            })}
          </div>

          <div className="section-title">{editingId ? 'Edit album' : 'Add an unrated album'}</div>
          <div className="card">
            <div className="disco-form">
              <div className="field">
                <label>Album name</label>
                <input value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} />
              </div>
              <div className="field">
                <label>Credited artist(s), comma-separated</label>
                <input
                  placeholder={artist}
                  value={draft.artists}
                  onChange={e => setDraft(d => ({ ...d, artists: e.target.value }))}
                />
                <span className="field-hint">
                  Name every artist on it and the album files itself into each of
                  their discographies — you only enter it once.
                </span>
              </div>
              <div className="field" style={{ maxWidth: 120 }}>
                <label>Year</label>
                <input inputMode="numeric" value={draft.year} onChange={e => setDraft(d => ({ ...d, year: e.target.value }))} />
              </div>
              <div className="field">
                <label>Cover</label>
                <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onCoverFile} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {draft.cover && <img src={draft.cover} alt="" className="disco-preview" />}
                  <button className="pill" onClick={() => fileRef.current?.click()}>
                    {draft.cover ? 'Replace image' : 'Upload image'}
                  </button>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button className="pill tint" disabled={busy} onClick={saveDraft}>
                {busy ? 'Saving…' : editingId ? 'Save changes' : 'Add album'}
              </button>
              {editingId && (
                <button className="pill" onClick={() => { setEditingId(null); setDraft(BLANK) }}>Cancel</button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
