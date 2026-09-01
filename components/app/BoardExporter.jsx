'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { extractPalette, fallbackPalette, paletteFromColor } from '../../lib/rating-colors'
import { LeaderboardTitleFrame, LeaderboardFrame, MoversFrame } from '../../lib/export/leaderboardFrames.jsx'
import ExportSettings, { SWATCHES } from './ExportSettings'
import { STYLES, STYLE_LIST } from '../../lib/export/styles.js'

const W = 1080
const H = 1920
const STORE = 'ppr.export.settings'

// Stored preferences cannot grant a style the account does not include.
const freeFallback = id =>
  STYLES[id]?.tier === 'paid' ? (STYLE_LIST.find(s => s.tier === 'free')?.id || 'paper') : id   // shares the album exporter's preferences

const DEFAULTS = {
  gradient: true, glass: true, align: 'top', textSize: 'auto', featureDrop: 2,
  accent: 'auto', perPage: 'auto', scale: 'first', safeZones: false,
  style: 'signature', watermark: true, handle: '@the.press.play',
  include: { title: true, songs: true, criteria: true, rank: true, discography: true }
}

export default function BoardExporter ({ data, paid = false }) {
  const [settings, setSettings] = useState(DEFAULTS)
  const [cover, setCover] = useState(null)
  const [panel, setPanel] = useState(false)
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')
  const stage = useRef(null)

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORE)
      if (!raw) return
      const saved = { ...DEFAULTS, ...JSON.parse(raw) }
      if (!paid) { saved.style = freeFallback(saved.style); saved.watermark = true }
      setSettings(saved)
    } catch {}
  }, [])

  const set = (key, value) => setSettings(s => {
    const next = { ...s, [key]: value }
    try { window.localStorage.setItem(STORE, JSON.stringify(next)) } catch {}
    return next
  })
  const reset = () => {
    setSettings(DEFAULTS)
    try { window.localStorage.removeItem(STORE) } catch {}
  }

  // The board takes its colour from whatever is currently number one.
  useEffect(() => {
    const first = data.top[0]?.coverProxied
    if (!first) { setCover(fallbackPalette()); return }
    extractPalette(first).then(p => setCover(p || fallbackPalette())).catch(() => setCover(fallbackPalette()))
  }, [data])

  const palette = useMemo(() => {
    if (!cover) return null
    if (settings.accent === 'auto') return cover
    const hex = SWATCHES.find(([id]) => id === settings.accent)?.[2]
    if (!hex) return cover
    try { return paletteFromColor(hex) || cover } catch { return cover }
  }, [cover, settings.accent])

  const frames = useMemo(() => {
    if (!palette) return []
    const theme = settings
    const out = [{
      key: 'title', label: 'Leaderboard title',
      node: <LeaderboardTitleFrame total={data.total} top={data.top} palette={palette} theme={theme} />
    }]
    if (data.climbers.length || data.fallers.length) {
      out.push({
        key: 'movers', label: 'Biggest movers',
        node: <MoversFrame climbers={data.climbers} fallers={data.fallers} palette={palette} theme={theme} />
      })
    }
    data.pages.forEach((p, i) => out.push({
      key: `page-${i}`,
      label: `Ranks ${p.from}–${p.to}`,
      node: <LeaderboardFrame rows={p.rows} from={p.from} to={p.to} total={data.total} palette={palette} theme={theme} />
    }))
    return out
  }, [palette, settings, data])

  const shoot = async i => {
    const node = stage.current?.querySelector(`[data-frame="${i}"]`)
    if (!node) throw new Error('That slide is not on the page.')
    await toPng(node, { width: W, height: H, pixelRatio: 1, cacheBust: true })
    return toPng(node, { width: W, height: H, pixelRatio: 1, cacheBust: true })
  }
  const save = (url, name) => {
    const a = document.createElement('a')
    a.href = url; a.download = name; a.click()
  }
  const one = async i => {
    setError(''); setBusy(frames[i].key)
    try { save(await shoot(i), `leaderboard-${String(i + 1).padStart(2, '0')}.png`) }
    catch (e) { setError(e.message || 'Could not render that slide.') }
    finally { setBusy(null) }
  }
  const all = async () => {
    setError(''); setBusy('all')
    try {
      for (let i = 0; i < frames.length; i++) {
        save(await shoot(i), `leaderboard-${String(i + 1).padStart(2, '0')}.png`)
        await new Promise(r => setTimeout(r, 320))
      }
    } catch (e) { setError(e.message || 'Could not render the slides.') }
    finally { setBusy(null) }
  }

  if (!palette) return <p className="notice">Reading the colours off the top album…</p>

  return (
    <div className="exp">
      <div className="exp-bar">
        <button className="chip chip-set" onClick={() => setPanel(true)}>Settings</button>
        <span className="exp-summary">
          {frames.length} slides · {data.total} albums
          {!data.hasSnapshot && ' · freeze the standings to show movement'}
        </span>
        <button className="btn-primary" onClick={all} disabled={!!busy}>
          {busy === 'all' ? 'Rendering…' : `Download all ${frames.length}`}
        </button>
      </div>

      <ExportSettings open={panel} onClose={() => setPanel(false)}
        settings={settings} set={set} onReset={reset} paid={paid} />

      {error && <p className="notice notice-bad">{error}</p>}

      <ul className="exp-grid">
        {frames.map((f, i) => (
          <li key={f.key}>
            <div className="exp-shot">
              <div className="exp-scale">
                <div style={{ width: W, height: H, overflow: 'hidden' }}>{f.node}</div>
              </div>
            </div>
            <div className="exp-meta">
              <span>{f.label}</span>
              <button onClick={() => one(i)} disabled={!!busy}>
                {busy === f.key ? 'Rendering…' : 'PNG'}
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div ref={stage} className="exp-stage" aria-hidden="true">
        {frames.map((f, i) => (
          <div key={f.key} data-frame={i} style={{ width: W, height: H, overflow: 'hidden' }}>{f.node}</div>
        ))}
      </div>
    </div>
  )
}
