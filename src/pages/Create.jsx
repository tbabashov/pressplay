import React, { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'

const emptyTrack = () => ({ name: '', dur: '', feats: '' })

function durToMs (text) {
  const parts = text.trim().split(':').map(Number)
  if (!text.trim() || parts.some(isNaN)) return 0
  return parts.reduce((a, b) => a * 60 + b, 0) * 1000
}

export default function Create () {
  const nav = useNavigate()
  const [cover, setCover] = useState(null)
  const [name, setName] = useState('')
  const [artist, setArtist] = useState('')
  const [year, setYear] = useState('')
  const [genre, setGenre] = useState('')
  const [tracks, setTracks] = useState([emptyTrack(), emptyTrack(), emptyTrack()])
  const [pasteMode, setPasteMode] = useState(false)
  const [pasteText, setPasteText] = useState('')
  const [err, setErr] = useState('')
  const [saving, setSaving] = useState(false)
  const coverInputRef = useRef(null)

  function onCoverFile (e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const size = Math.min(1000, Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      const s = Math.max(size / img.width, size / img.height)
      ctx.drawImage(img, (size - img.width * s) / 2, (size - img.height * s) / 2, img.width * s, img.height * s)
      setCover(canvas.toDataURL('image/jpeg', 0.85))
      URL.revokeObjectURL(url)
    }
    img.onerror = () => { setErr('Could not read that image'); URL.revokeObjectURL(url) }
    img.src = url
  }

  function setTrack (i, key, value) {
    setTracks(prev => prev.map((t, j) => j === i ? { ...t, [key]: value } : t))
  }

  // Each line: "Title", "Title 3:45", "Title - 3:45" or "1. Title - 3:45"
  function applyPaste () {
    const rows = pasteText.split('\n').map(l => l.trim()).filter(Boolean).map(line => {
      let s = line.replace(/^\d+[.)]?\s+/, '')
      let dur = ''
      const m = s.match(/[\s–—-]+(\d+:\d{2})\s*$/)
      if (m) { dur = m[1]; s = s.slice(0, m.index).trim() }
      let feats = ''
      const f = s.match(/[([](?:feat\.?|ft\.?|featuring)\s+([^)\]]+)[)\]]/i)
      if (f) { feats = f[1]; s = s.replace(f[0], '').trim() }
      return { name: s, dur, feats }
    })
    if (rows.length) setTracks(rows)
    setPasteMode(false)
    setPasteText('')
  }

  async function submit () {
    setErr('')
    const cleanTracks = tracks.filter(t => t.name.trim())
    if (!name.trim()) return setErr('Album title is required')
    if (!artist.trim()) return setErr('Artist is required')
    if (cleanTracks.length === 0) return setErr('Add at least one track')
    setSaving(true)
    try {
      const id = `manual:${Date.now()}`
      const artists = artist.split(',').map(s => s.trim()).filter(Boolean)
      const albumTracks = cleanTracks.map((t, i) => ({
        id: `${id}:t${i}`,
        name: t.name.trim(),
        durationMs: durToMs(t.dur),
        trackNumber: i + 1,
        discNumber: 1,
        artists,
        features: t.feats.split(',').map(s => s.trim()).filter(Boolean)
      }))
      const album = {
        id,
        name: name.trim(),
        artists,
        releaseDate: year.trim() || null,
        year: year.trim() || null,
        genre: genre.trim() || null,
        cover,
        coverSmall: cover,
        runtimeMs: albumTracks.reduce((a, t) => a + t.durationMs, 0),
        tracks: albumTracks
      }
      await api.saveReview(id, { album, ratings: {}, coverOverride: cover })
      nav(`/rate/${id}`)
    } catch (e) {
      setErr(e.message)
      setSaving(false)
    }
  }

  return (
    <div className="app">
      <div className="nav">
        <button className="pill" onClick={() => nav('/')}>‹ Back</button>
        <h1 style={{ fontSize: 22 }}>Manual Album</h1>
        <span style={{ width: 70 }} />
      </div>

      <div className="card" style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 18, alignItems: 'flex-start', marginBottom: 16 }}>
          <input ref={coverInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onCoverFile} />
          <div
            className="create-cover" title="Upload album cover"
            onClick={() => coverInputRef.current?.click()}
            style={cover ? { backgroundImage: `url(${cover})` } : {}}
          >
            {!cover && <span>+ Cover</span>}
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="field"><input placeholder="Album title" value={name} onChange={e => setName(e.target.value)} /></div>
            <div className="field"><input placeholder="Artist(s), comma-separated" value={artist} onChange={e => setArtist(e.target.value)} /></div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div className="field" style={{ width: 110 }}><input placeholder="Year" value={year} onChange={e => setYear(e.target.value)} /></div>
              <div className="field" style={{ flex: 1 }}><input placeholder="Genre" value={genre} onChange={e => setGenre(e.target.value)} /></div>
            </div>
          </div>
        </div>
      </div>

      <div className="section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Tracklist
        <button className="pill" style={{ fontSize: 13 }} onClick={() => setPasteMode(m => !m)}>
          {pasteMode ? 'Cancel paste' : 'Paste tracklist'}
        </button>
      </div>

      {pasteMode ? (
        <div className="card">
          <div className="field">
            <textarea
              rows={10} autoFocus
              placeholder={'One track per line, e.g.\n1. Intro - 1:32\nMain Song (feat. Someone) - 3:45\nOutro'}
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
            />
          </div>
          <button className="pill tint" style={{ marginTop: 10 }} onClick={applyPaste}>Apply</button>
        </div>
      ) : (
        <div className="card">
          {tracks.map((t, i) => (
            <div key={i} className="create-track">
              <span className="num">{i + 1}</span>
              <input placeholder="Track title" value={t.name} onChange={e => setTrack(i, 'name', e.target.value)} style={{ flex: 2 }} />
              <input placeholder="3:45" value={t.dur} onChange={e => setTrack(i, 'dur', e.target.value)} style={{ width: 64, textAlign: 'center' }} />
              <input placeholder="Features (comma-sep.)" value={t.feats} onChange={e => setTrack(i, 'feats', e.target.value)} style={{ flex: 1.4 }} />
              <button
                className="track-remove" style={{ opacity: 1 }}
                onClick={() => setTracks(prev => prev.length > 1 ? prev.filter((_, j) => j !== i) : prev)}
              >✕</button>
            </div>
          ))}
          <button className="pill" style={{ marginTop: 12 }} onClick={() => setTracks(prev => [...prev, emptyTrack()])}>
            + Add Track
          </button>
        </div>
      )}

      {err && <div className="err" style={{ marginTop: 12 }}>{err}</div>}

      <div className="save-bar">
        <button className="btn-save" disabled={saving} onClick={submit}>
          {saving ? 'Creating…' : 'Create & Rate →'}
        </button>
      </div>
    </div>
  )
}
