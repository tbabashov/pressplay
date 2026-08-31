import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api.js'
import { paletteFromColor } from '../colors.js'
import { embedder } from '../export/embed.js'
import { useTheme, ThemeBar, FramesStrip, useFrameDownloader } from '../export/exportUI.jsx'
import {
  UpdateIntroFrame, LeaderboardTitleFrame, LeaderboardFrame, SongJumpsFrame, MoversFrame
} from '../export/leaderboardFrames.jsx'

const ROWS_PER_PAGE = 13
const NOTES_PER_PAGE = 3
const JUMPS_PER_PAGE = 8
const MAX_JUMPS = 16

// No single album owns this video, so the accent is picked by hand.
const TONES = [
  ['Graphite', { r: 96, g: 102, b: 118 }],
  ['Indigo', { r: 92, g: 96, b: 210 }],
  ['Crimson', { r: 196, g: 62, b: 74 }],
  ['Emerald', { r: 42, g: 166, b: 116 }],
  ['Gold', { r: 206, g: 164, b: 62 }]
]

const DEFAULT_NOTES = [
  {
    title: 'The scale now goes to 11',
    body: 'A song can be rated 11 — Majestic. It sits above a 10 and counts as a full 11 in the average, so the very best songs finally have room to pull an album up.'
  },
  {
    title: 'An album is no longer just its song average',
    body: 'The final rating is the mean of six equally weighted numbers: the song average, plus Lyricism, Production, Delivery, Album Experience and Replay Value.'
  },
  {
    title: 'Skits and interludes are N/A',
    body: 'They are no longer scored at all, and they are excluded from the song average — so an album stops being punished for having them.'
  }
]

const chunk = (arr, n) => {
  const out = []
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n))
  return out
}

export default function Update () {
  const nav = useNavigate()
  const [data, setData] = useState(null)
  const [snapshots, setSnapshots] = useState([])
  const [baseline, setBaseline] = useState('')
  const [notes, setNotes] = useState([])
  const [tone, setTone] = useState(() => localStorage.getItem('updateTone') || 'Graphite')
  const [opts, setOpts] = useState(() => {
    try { return { movers: true, jumps: true, ...JSON.parse(localStorage.getItem('updateOpts') || '{}') } } catch { return { movers: true, jumps: true } }
  })
  const [theme, setTheme] = useTheme()
  const [showSafe, setShowSafe] = useState(false)
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const frameRefs = useRef([])

  const palette = useMemo(
    () => paletteFromColor((TONES.find(t => t[0] === tone) || TONES[0])[1]),
    [tone]
  )

  function setOpt (key, value) {
    setOpts(prev => {
      const next = { ...prev, [key]: value }
      localStorage.setItem('updateOpts', JSON.stringify(next))
      return next
    })
  }

  useEffect(() => { api.snapshots().then(d => setSnapshots(d.snapshots)).catch(e => setErr(e.message)) }, [])
  useEffect(() => { load(baseline) }, [baseline])

  async function load (snapshot) {
    try {
      const d = await api.leaderboardUpdate(snapshot)
      const embed = embedder()
      for (const r of d.rows) r.coverProxied = await embed(r.album.coverSmall || r.album.cover)
      setData(d)
      setNotes(d.notes?.length ? d.notes : DEFAULT_NOTES)
    } catch (e) { setErr(e.message) }
  }

  async function takeSnapshot () {
    if (!window.confirm('Freeze the leaderboard as it stands right now? This becomes the "before" side of the next update video.')) return
    setBusy(true)
    try {
      await api.createSnapshot(new Date().toISOString().slice(0, 10))
      setSnapshots((await api.snapshots()).snapshots)
    } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  async function saveNotes () {
    setBusy(true)
    try { await api.saveUpdateNotes(notes) } catch (e) { setErr(e.message) } finally { setBusy(false) }
  }

  const jumps = useMemo(() => {
    if (!data) return []
    return data.rows
      .filter(r => r.bestJump)
      .map(r => ({ ...r.bestJump, albumId: r.albumId, albumName: r.album.name, coverProxied: r.coverProxied }))
      .sort((a, b) => b.gain - a.gain)
      .slice(0, MAX_JUMPS)
  }, [data])

  const frames = useMemo(() => {
    if (!data) return []
    const list = []

    chunk(notes.filter(n => n.title?.trim()), NOTES_PER_PAGE).forEach((page, i, all) => {
      list.push({
        key: `intro-${i}`,
        node: (
          <UpdateIntroFrame
            notes={page} offset={i * NOTES_PER_PAGE} page={i + 1} pages={all.length}
            palette={palette} theme={theme}
          />
        )
      })
    })

    const moved = data.rows.filter(r => typeof r.rankDelta === 'number' && r.rankDelta !== 0)
    if (opts.movers && moved.length > 0) {
      list.push({
        key: 'movers',
        node: (
          <MoversFrame
            climbers={[...moved].sort((a, b) => b.rankDelta - a.rankDelta).slice(0, 4)}
            fallers={[...moved].sort((a, b) => a.rankDelta - b.rankDelta).slice(0, 4)}
            palette={palette} theme={theme}
          />
        )
      })
    }

    list.push({
      key: 'lb-title',
      node: (
        <LeaderboardTitleFrame
          total={data.totalRanked} top={data.rows.slice(0, 3)}
          palette={palette} theme={theme}
        />
      )
    })

    chunk(data.rows, ROWS_PER_PAGE).forEach((rows, i) => {
      list.push({
        key: `lb-${i}`,
        node: (
          <LeaderboardFrame
            rows={rows} from={i * ROWS_PER_PAGE + 1} to={i * ROWS_PER_PAGE + rows.length}
            total={data.totalRanked} palette={palette} theme={theme}
          />
        )
      })
    })

    if (opts.jumps && jumps.length > 0) {
      chunk(jumps, JUMPS_PER_PAGE).forEach((page, i, all) => {
        list.push({
          key: `jumps-${i}`,
          node: <SongJumpsFrame jumps={page} page={i + 1} pages={all.length} palette={palette} theme={theme} />
        })
      })
    }
    return list
  }, [data, notes, palette, theme, opts, jumps])

  const { downloading, downloadAll } = useFrameDownloader(frameRefs, 'leaderboard-update', setErr)

  if (err && !data) return <div className="app"><div className="muted">{err}</div></div>
  if (!data) return <div className="app"><span className="spin" /></div>

  return (
    <div className="app" style={{ maxWidth: 1100 }}>
      <div className="nav">
        <h1>Leaderboard Update</h1>
        <div className="links">
          <button className="pill" onClick={() => nav('/discography')}>Discographies</button>
          <button className="pill" onClick={() => nav('/')}>‹ Home</button>
          <button className="pill tint" disabled={downloading} onClick={downloadAll}>
            {downloading ? 'Exporting…' : `Download All (${frames.length} PNGs)`}
          </button>
        </div>
      </div>

      {err && <div className="err" style={{ marginBottom: 12 }}>{err}</div>}

      <div className="opts-row">
        <span className="swatch-label">Compare against</span>
        <select
          className="mini-select"
          value={baseline || (data.snapshot?.id ?? '')}
          onChange={e => setBaseline(e.target.value)}
        >
          {snapshots.map(s => (
            <option key={s.id} value={s.id}>{s.label} · {s.count} albums</option>
          ))}
        </select>
        <button className="pill" disabled={busy} onClick={takeSnapshot}>Freeze current standings</button>
        {[['movers', 'Movers image'], ['jumps', 'Song jumps images']].map(([key, label]) => (
          <button
            key={key}
            className={`toggle-chip${opts[key] ? ' on' : ''}`}
            onClick={() => setOpt(key, !opts[key])}
          >{label}: {opts[key] ? 'On' : 'Off'}</button>
        ))}
      </div>

      <div className="opts-row">
        <span className="swatch-label">Accent</span>
        <div className="source-tabs">
          {TONES.map(([label]) => (
            <button
              key={label}
              className={`source-tab${tone === label ? ' active' : ''}`}
              onClick={() => { setTone(label); localStorage.setItem('updateTone', label) }}
            >{label}</button>
          ))}
        </div>
      </div>

      <ThemeBar theme={theme} setTheme={setTheme} showSafe={showSafe} setShowSafe={setShowSafe} />

      <div className="section-title">Update announcement</div>
      <div className="card">
        {notes.map((n, i) => (
          <div className="note-row" key={i}>
            <span className="note-num">{String(i + 1).padStart(2, '0')}</span>
            <div className="field" style={{ flex: 1 }}>
              <input
                placeholder="Headline"
                value={n.title}
                onChange={e => setNotes(prev => prev.map((x, j) => j === i ? { ...x, title: e.target.value } : x))}
              />
              <textarea
                rows={2} placeholder="One or two sentences explaining it"
                value={n.body}
                onChange={e => setNotes(prev => prev.map((x, j) => j === i ? { ...x, body: e.target.value } : x))}
              />
            </div>
            <button className="row-delete" title="Remove" onClick={() => setNotes(prev => prev.filter((_, j) => j !== i))}>✕</button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <button className="pill" onClick={() => setNotes(prev => [...prev, { title: '', body: '' }])}>+ Point</button>
          <button className="pill" onClick={() => setNotes(DEFAULT_NOTES)}>Reset to defaults</button>
          <button className="pill tint" disabled={busy} onClick={saveNotes}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </div>

      <FramesStrip frames={frames} frameRefs={frameRefs} showSafe={showSafe} />

      <div className="muted" style={{ paddingTop: 0 }}>
        {frames.length} images · 1080 × 1920 · comparing against{' '}
        {data.snapshot ? `“${data.snapshot.label}”` : 'nothing yet — freeze a baseline first'}
      </div>
    </div>
  )
}
