'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { extractPalette, fallbackPalette, paletteFromColor } from '../../lib/rating-colors'
import { SafeZoneOverlay } from '../../lib/export/shell.jsx'
import ExportSettings, { SWATCHES } from './ExportSettings'
import StylePicker from './StylePicker'
import { STYLES, STYLE_LIST } from '../../lib/export/styles.js'
import ArtistImages from './ArtistImages'
import {
  TitleFrame, TracksFrame, CriteriaFrame, ComparisonFrame, DiscographyFrame
} from '../../lib/export/frames.jsx'

const W = 1080
const H = 1920
const STORE = 'ppr.export.settings'

// Stored preferences cannot grant a style the account does not include.
const freeFallback = id =>
  STYLES[id]?.tier === 'paid' ? (STYLE_LIST.find(s => s.tier === 'free')?.id || 'paper') : id

const DEFAULTS = {
  gradient: true, glass: true, align: 'top', textSize: 'auto', featureDrop: 2,
  accent: 'auto', perPage: 'auto', scale: 'first', safeZones: false,
  style: 'paper', watermark: true, showHandle: false, handle: '@the.press.play',
  autoDiscography: true,
  bg: null, dome: true, discPerPage: 9,
  include: { title: true, songs: true, criteria: true, rank: true, discography: true }
}

function loadSettings () {
  if (typeof window === 'undefined') return DEFAULTS
  try {
    const raw = window.localStorage.getItem(STORE)
    if (!raw) return DEFAULTS
    const saved = JSON.parse(raw)
    return { ...DEFAULTS, ...saved, include: { ...DEFAULTS.include, ...(saved.include || {}) } }
  } catch { return DEFAULTS }
}

export default function Exporter ({ data, paid = false }) {
  const [coverPalette, setCoverPalette] = useState(null)
  // Start from defaults so server and client markup agree, then adopt whatever
  // was saved once mounted.
  const [settings, setSettings] = useState(DEFAULTS)
  const [panel, setPanel] = useState(false)
  const [stylePanel, setStylePanel] = useState(false)
  const [viewing, setViewing] = useState(null)   // index of the slide opened full size
  const rail = useRef(null)
  const [cutouts, setCutouts] = useState(data.review.artistImages || [])
  const [saveState, setSaveState] = useState('idle')
  const [busy, setBusy] = useState(null)
  const [error, setError] = useState('')
  const stage = useRef(null)

  useEffect(() => {
    const saved = loadSettings()
    // Stored preferences cannot grant what the plan does not include.
    if (!paid) { saved.style = freeFallback(saved.style); saved.watermark = true }
    setSettings(saved)
  }, [paid])

  const set = (key, value) => setSettings(s => {
    const next = { ...s, [key]: value }
    try { window.localStorage.setItem(STORE, JSON.stringify(next)) } catch {}
    return next
  })
  const reset = () => {
    setSettings(DEFAULTS)
    try { window.localStorage.removeItem(STORE) } catch {}
  }

  const theme = settings

  useEffect(() => {
    extractPalette(data.review.album.coverProxied)
      .then(p => setCoverPalette(p || fallbackPalette()))
      .catch(() => setCoverPalette(fallbackPalette()))
  }, [data])

  // An accent choice replaces the palette the cover produced.
  const palette = useMemo(() => {
    if (!coverPalette) return null
    if (settings.accent === 'auto') return coverPalette
    const hex = SWATCHES.find(([id]) => id === settings.accent)?.[2]
    if (!hex) return coverPalette
    try { return paletteFromColor(hex) || coverPalette } catch { return coverPalette }
  }, [coverPalette, settings.accent])

  // A long tracklist becomes several pages rather than one unreadable one.
  const pages = useMemo(() => {
    const t = data.review.album.tracks
    const auto = settings.perPage === 'auto'
    const cap = auto ? 14 : Number(settings.perPage)
    const count = Math.max(1, Math.ceil(t.length / cap))
    // On auto the pages are levelled so the last one is never a lonely single
    // row. A number that was actually chosen is honoured instead: levelling a
    // request for twelve down to eight is the setting overruling the person who
    // set it, which is not what a setting is for.
    const per = auto ? Math.ceil(t.length / count) : cap
    return Array.from({ length: count }, (_, i) => t.slice(i * per, (i + 1) * per))
  }, [data, settings.perPage])

  // Dragging fires on every pointer move, so the picture follows the hand
  // immediately and the write waits until the hand stops. Without that a single
  // drag would be a hundred POSTs.
  const nudgeTimer = useRef(null)
  const nudgePending = useRef(null)

  const nudgeCutout = useCallback((index, patch) => {
    setCutouts(prev => {
      const next = prev.map((c, i) => (i === index ? { ...c, ...patch } : c))
      nudgePending.current = next
      return next
    })
    clearTimeout(nudgeTimer.current)
    nudgeTimer.current = setTimeout(() => {
      if (nudgePending.current) saveCutouts(nudgePending.current)
    }, 650)
  }, [])

  useEffect(() => () => clearTimeout(nudgeTimer.current), [])


  const frames = useMemo(() => {
    if (!palette) return []
    const on = k => settings.include[k] !== false
    const out = []
    if (on('title')) out.push({
      key: 'title', label: 'Title card',
      node: <TitleFrame data={data} palette={palette} theme={theme} images={cutouts} onImageChange={nudgeCutout} />
    })
    if (on('songs')) pages.forEach((tracks, i) => out.push({
      key: `songs-${i}`,
      label: pages.length > 1 ? `Songs ${i + 1} of ${pages.length}` : 'Every song, scored',
      node: <TracksFrame data={data} palette={palette} theme={theme} tracks={tracks}
              showScale={settings.scale === 'every' || (settings.scale === 'first' && i === 0)}
              dense={tracks.length > 12} />
    }))
    if (on('criteria')) out.push({ key: 'criteria', label: 'The criteria', node: <CriteriaFrame data={data} palette={palette} theme={theme} /> })
    if (on('rank') && data.ladder?.length) out.push({ key: 'rank', label: 'Where it lands', node: <ComparisonFrame data={data} palette={palette} theme={theme} /> })
    // A discography of any size has to be split, or the grid runs off the frame.
    if (on('discography')) data.discographies?.forEach((g0, gi) => {
      // The catalogue fill is built server-side either way; dropping it here
      // keeps the toggle instant instead of costing a page reload.
      const albums = settings.autoDiscography === false
        ? g0.albums.filter(a => a.source !== 'auto')
        : g0.albums
      if (!albums.length) return
      const g = { ...g0, albums }
      const per = Number(settings.discPerPage) || 9
      const pages = Math.max(1, Math.ceil(albums.length / per))
      const size = Math.ceil(albums.length / pages)
      const counts = { rated: albums.filter(a => a.rated).length, total: albums.length }
      for (let i = 0; i < pages; i++) {
        const slice = { ...g, albums: g.albums.slice(i * size, (i + 1) * size) }
        out.push({
          key: `disc-${gi}-${i}`,
          label: pages > 1 ? `${g.artist} discography ${i + 1} of ${pages}` : `${g.artist} discography`,
          node: <DiscographyFrame group={slice} page={i + 1} pages={pages} counts={counts}
                  currentAlbumName={data.review.album.name} palette={palette} theme={theme} />
        })
      }
    })
    return out
  }, [palette, theme, data, pages, settings.include, settings.scale, settings.discPerPage, settings.autoDiscography, cutouts])

  // Cut-outs belong to the review, not to this page, so they persist.
  useEffect(() => {
    if (viewing === null) return
    const onKey = e => {
      if (e.key === 'Escape') setViewing(null)
      if (e.key === 'ArrowRight') setViewing(v => (v + 1) % frames.length)
      if (e.key === 'ArrowLeft') setViewing(v => (v - 1 + frames.length) % frames.length)
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [viewing, frames.length])

  const saveCutouts = async next => {
    setCutouts(next)
    setSaveState('saving')
    try {
      const r = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ albumId: data.review.albumId, artistImages: next })
      })
      setSaveState(r.ok ? 'saved' : 'error')
    } catch { setSaveState('error') }
  }

  const shoot = async i => {
    const node = stage.current?.querySelector(`[data-frame="${i}"]`)
    if (!node) throw new Error('That slide is not on the page.')
    // The transform box and the corner handles on an editable cut-out carry
    // data-no-export. Without this filter they are rasterised into the PNG, so
    // every title card ships with the editing chrome drawn over the artist.
    const opts = {
      width: W, height: H, pixelRatio: 1, cacheBust: true,
      filter: n => !n?.dataset || n.dataset.noExport === undefined
    }
    // Two passes: the first warms fonts and images so the second is complete.
    await toPng(node, opts)
    return toPng(node, opts)
  }

  const save = (url, name) => {
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
  }

  const slug = `${data.review.album.artist || data.review.album.artists?.[0] || 'album'}-${data.review.album.name}`
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const one = async i => {
    setError(''); setBusy(frames[i].key)
    try { save(await shoot(i), `${slug}-${String(i + 1).padStart(2, '0')}.png`) }
    catch (e) { setError(e.message || 'Could not render that slide.') }
    finally { setBusy(null) }
  }

  const all = async () => {
    setError(''); setBusy('all')
    try {
      for (let i = 0; i < frames.length; i++) {
        save(await shoot(i), `${slug}-${String(i + 1).padStart(2, '0')}.png`)
        await new Promise(r => setTimeout(r, 320))   // browsers throttle rapid downloads
      }
    } catch (e) {
      setError(e.message || 'Could not render the slides.')
    } finally { setBusy(null) }
  }

  if (!palette) return <p className="notice">Reading the colours off the cover…</p>

  return (
    <div className="exp">
      <div className="exp-bar">
        <button className="chip chip-set" onClick={() => setPanel(true)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 15.4a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8Z" fill="none" stroke="currentColor" strokeWidth="1.9" />
            <path d="M19.4 13.5a1.5 1.5 0 0 0 .3 1.65l.06.06a1.8 1.8 0 1 1-2.55 2.55l-.06-.06a1.5 1.5 0 0 0-2.55 1.06V19a1.8 1.8 0 1 1-3.6 0v-.1a1.5 1.5 0 0 0-2.61-1 1.5 1.5 0 0 0-.33.98l.06.06a1.8 1.8 0 1 1-2.55-2.55l.06-.06A1.5 1.5 0 0 0 4.5 13.5H4.4a1.8 1.8 0 1 1 0-3.6h.1a1.5 1.5 0 0 0 1-2.61 1.5 1.5 0 0 0-.98-.33l-.06.06A1.8 1.8 0 1 1 7.01 4.47l.06.06a1.5 1.5 0 0 0 1.65.3h.07A1.5 1.5 0 0 0 9.7 3.5V3.4a1.8 1.8 0 0 1 3.6 0v.1a1.5 1.5 0 0 0 2.55 1.06l.06-.06a1.8 1.8 0 1 1 2.55 2.55l-.06.06a1.5 1.5 0 0 0-.3 1.65v.07a1.5 1.5 0 0 0 1.37.92h.1a1.8 1.8 0 0 1 0 3.6h-.1a1.5 1.5 0 0 0-1.37.92Z" fill="none" stroke="currentColor" strokeWidth="1.6" />
          </svg>
          Settings
        </button>
        <button className="chip chip-set" onClick={() => setStylePanel(true)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 3.2c-4.85 0-8.8 3.65-8.8 8.15 0 4.5 3.95 8.15 8.8 8.15.82 0 1.48-.63 1.48-1.4 0-.36-.15-.69-.39-.94a1.3 1.3 0 0 1-.37-.9c0-.77.66-1.4 1.48-1.4h1.74c2.68 0 4.86-2.05 4.86-4.58 0-4-3.95-7.08-8.8-7.08Z"
              fill="none" stroke="currentColor" strokeWidth="1.7" />
            <circle cx="7.6" cy="11.4" r="1.15" fill="currentColor" />
            <circle cx="11" cy="7.9" r="1.15" fill="currentColor" />
            <circle cx="15.2" cy="8.6" r="1.15" fill="currentColor" />
          </svg>
          Style
        </button>
        <span className="exp-summary">
          {frames.length} slide{frames.length === 1 ? '' : 's'}
          {settings.accent !== 'auto' && ' · custom colour'}
          {settings.safeZones && ' · safe zones on'}
        </span>
        <button className="btn-primary" onClick={all} disabled={!!busy || frames.length === 0}>
          {busy === 'all' ? 'Rendering…' : `Download all ${frames.length}`}
        </button>
      </div>

      <ExportSettings
        open={panel} onClose={() => setPanel(false)}
        settings={settings} set={set} onReset={reset} paid={paid}
      />

      <StylePicker
        open={stylePanel} onClose={() => setStylePanel(false)}
        settings={settings} set={set} paid={paid}
      />

      {settings.include.title !== false && (
        <section className="exp-cuts">
          <h2>Artist cut-outs</h2>
          <ArtistImages images={cutouts} onChange={saveCutouts} />
          {saveState === 'error' && <p className="cut-error">Could not save the cut-outs.</p>}
        </section>
      )}

      {error && <p className="notice notice-bad">{error}</p>}

      <div className="exp-rail-wrap">
        <button className="sl-arrow sl-prev" aria-label="Scroll the slides left"
          onClick={() => rail.current?.scrollBy({ left: -rail.current.clientWidth * 0.8, behavior: 'smooth' })}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>

        <ul className="exp-grid" ref={rail}>
        {frames.map((f, i) => (
          <li key={f.key}>
            <div
              className="exp-shot" role="button" tabIndex={0}
              onClick={() => setViewing(i)}
              onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setViewing(i) } }}
              aria-label={`${f.label}. Open it full size.`}
            >
              <div className="exp-scale">
                <div style={{ width: W, height: H, overflow: 'hidden', position: 'relative' }}>
                  {f.node}
                  {settings.safeZones && <SafeZoneOverlay />}
                </div>
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

        <button className="sl-arrow sl-next" aria-label="Scroll the slides right"
          onClick={() => rail.current?.scrollBy({ left: rail.current.clientWidth * 0.8, behavior: 'smooth' })}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 5.5 16 12l-6.5 6.5" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>

      {viewing !== null && frames[viewing] && (
        <div className="sv" role="dialog" aria-modal="true" aria-label={frames[viewing].label}>
          <button className="sv-scrim" onClick={() => setViewing(null)} aria-label="Close" />
          <button className="sv-arrow sv-prev" aria-label="Previous slide"
            onClick={() => setViewing(v => (v - 1 + frames.length) % frames.length)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5" fill="none"
              stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>

          <figure className="sv-figure">
            {/* The frame is live DOM, not a picture, so it is shown at a bigger
                scale rather than blown up from a thumbnail. */}
            <div
              className="sv-frame"
              ref={el => {
                if (!el) return
                // Fit the 1080px frame to the width the viewport allows.
                const k = el.clientWidth / W
                el.style.setProperty('--svs', String(k))
              }}
            >
              <div className="exp-scale sv-scale">
                <div style={{ width: W, height: H, overflow: 'hidden', position: 'relative' }}>
                  {frames[viewing].node}
                  {settings.safeZones && <SafeZoneOverlay />}
                </div>
              </div>
            </div>
            <figcaption>
              {frames[viewing].label}
              <em>{viewing + 1} of {frames.length}</em>
              <button className="btn-primary sv-png" onClick={() => one(viewing)} disabled={!!busy}>
                {busy === frames[viewing].key ? 'Rendering…' : 'Download PNG'}
              </button>
            </figcaption>
          </figure>

          <button className="sv-arrow sv-next" aria-label="Next slide"
            onClick={() => setViewing(v => (v + 1) % frames.length)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 5.5 16 12l-6.5 6.5" fill="none"
              stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>

          <button className="sv-close" onClick={() => setViewing(null)} aria-label="Close">
            <svg viewBox="0 0 24 24"><path d="M6.5 6.5l11 11m0-11l-11 11" fill="none"
              stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
          </button>
        </div>
      )}

      {/* The frames are rendered full size off-screen; the grid above only scales them. */}
      <div ref={stage} className="exp-stage" aria-hidden="true">
        {frames.map((f, i) => (
          <div key={f.key} data-frame={i} style={{ width: W, height: H, overflow: 'hidden' }}>{f.node}</div>
        ))}
      </div>
    </div>
  )
}
