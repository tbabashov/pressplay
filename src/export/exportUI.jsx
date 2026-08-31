import React, { useState } from 'react'
import { toPng } from 'html-to-image'
import {
  DEFAULT_THEME, ALIGNMENTS, TEXT_SIZES, FEATURE_DROPS,
  SafeZoneOverlay, FRAME_W, FRAME_H
} from './shell.jsx'

const PREVIEW_SCALE = 0.27

// The two beta looks are a global preference, not a per-album one — flipping
// them re-skins every image on both export screens at once.
export function useTheme () {
  const [theme, set] = useState(() => {
    try {
      const saved = { ...DEFAULT_THEME, ...JSON.parse(localStorage.getItem('frameTheme') || '{}') }
      // a value saved before one of these controls existed (or since removed)
      // would leave every button unlit while still driving the layout
      if (!ALIGNMENTS.some(([v]) => v === saved.align)) saved.align = DEFAULT_THEME.align
      if (!TEXT_SIZES.some(([v]) => v === saved.textSize)) saved.textSize = DEFAULT_THEME.textSize
      if (!FEATURE_DROPS.some(([v]) => v === saved.featureDrop)) saved.featureDrop = DEFAULT_THEME.featureDrop
      return saved
    } catch { return { ...DEFAULT_THEME } }
  })
  const setTheme = next => {
    set(prev => {
      const value = typeof next === 'function' ? next(prev) : next
      localStorage.setItem('frameTheme', JSON.stringify(value))
      return value
    })
  }
  return [theme, setTheme]
}

export function ThemeBar ({ theme, setTheme, showSafe, setShowSafe, palette, pickedColor, onPickSwatch }) {
  const toggle = key => setTheme(t => ({ ...t, [key]: !t[key] }))
  return (
    <div className="opts-row">
      <span className="swatch-label">Align</span>
      <div className="source-tabs">
        {ALIGNMENTS.map(([val, label]) => (
          <button
            key={val}
            className={`source-tab${(theme.align || 'top') === val ? ' active' : ''}`}
            title="Which end of the image the tracklist, ladder or grid settles against"
            onClick={() => setTheme(t => ({ ...t, align: val }))}
          >{label}</button>
        ))}
      </div>

      <span className="swatch-label" style={{ marginLeft: 12 }}>Beta</span>
      <button
        className={`toggle-chip beta${theme.gradient ? ' on' : ''}`}
        title="Replace the flat background with a layered gradient built from the cover's hue"
        onClick={() => toggle('gradient')}
      >Gradient background</button>
      <button
        className={`toggle-chip beta${theme.glass ? ' on' : ''}`}
        title="Render every section as Apple-style crystal glass instead of a grey card"
        onClick={() => toggle('glass')}
      >Crystal glass sections</button>
      <button
        className={`toggle-chip${showSafe ? ' on' : ''}`}
        title="Shade the bands TikTok's own UI sits on top of (preview only — never exported)"
        onClick={() => setShowSafe(v => !v)}
      >Safe zones</button>

      {onPickSwatch && palette?.swatches?.length > 0 && (
        <>
          <span className="swatch-label" style={{ marginLeft: 12 }}>Theme</span>
          <button
            className={`swatch auto${pickedColor === null ? ' active' : ''}`}
            title="Auto (from cover)"
            onClick={() => onPickSwatch(null)}
          >A</button>
          {palette.swatches.map((c, i) => {
            const active = pickedColor && Math.round(pickedColor.r) === Math.round(c.r) &&
              Math.round(pickedColor.g) === Math.round(c.g) && Math.round(pickedColor.b) === Math.round(c.b)
            return (
              <button
                key={i}
                className={`swatch${active ? ' active' : ''}`}
                style={{ background: `rgb(${c.r | 0}, ${c.g | 0}, ${c.b | 0})` }}
                title="Use this color for the images"
                onClick={() => onPickSwatch({ r: c.r, g: c.g, b: c.b })}
              />
            )
          })}
        </>
      )}
    </div>
  )
}

// Only the album video has a tracklist, so these live apart from ThemeBar —
// they'd be dead controls on the leaderboard-update screen.
export function SongTextBar ({ theme, setTheme }) {
  const pick = (key, val) => setTheme(t => ({ ...t, [key]: val }))
  const group = (label, key, options, current, title) => (
    <>
      <span className="swatch-label">{label}</span>
      <div className="source-tabs" title={title}>
        {options.map(([val, text]) => (
          <button
            key={val}
            className={`source-tab${current === val ? ' active' : ''}`}
            onClick={() => pick(key, val)}
          >{text}</button>
        ))}
      </div>
    </>
  )
  return (
    <div className="opts-row">
      {group('Song text', 'textSize', TEXT_SIZES, theme.textSize || 'auto',
        'Title size for the whole tracklist — every row always matches')}
      <span style={{ width: 12 }} />
      {group('Feature size', 'featureDrop', FEATURE_DROPS,
        typeof theme.featureDrop === 'number' ? theme.featureDrop : 2,
        'How much smaller the ft. credit is than the song title')}
    </div>
  )
}

export function FramesStrip ({ frames, frameRefs, showSafe }) {
  return (
    <div className="frames-strip">
      {frames.map((f, i) => (
        <div
          key={f.key}
          className="frame-preview"
          style={{ width: FRAME_W * PREVIEW_SCALE, height: FRAME_H * PREVIEW_SCALE }}
        >
          <div
            ref={el => { frameRefs.current[i] = el }}
            style={{ transform: `scale(${PREVIEW_SCALE})`, transformOrigin: 'top left' }}
          >
            {f.node}
          </div>
          {/* outside the captured node, so the shading never lands in a PNG */}
          {showSafe && (
            <div style={{ position: 'absolute', inset: 0, transform: `scale(${PREVIEW_SCALE})`, transformOrigin: 'top left', width: FRAME_W, height: FRAME_H }}>
              <SafeZoneOverlay />
            </div>
          )}
          <span className="frame-index">{i + 1}</span>
        </div>
      ))}
    </div>
  )
}

export function useFrameDownloader (frameRefs, slug, setErr) {
  const [downloading, setDownloading] = useState(false)

  async function downloadAll () {
    setDownloading(true)
    try {
      for (let i = 0; i < frameRefs.current.length; i++) {
        const node = frameRefs.current[i]
        if (!node) continue
        const png = await toPng(node, {
          width: FRAME_W,
          height: FRAME_H,
          pixelRatio: 1,
          style: { transform: 'none' },
          // editing chrome (the cut-out's transform box and handles) lives
          // inside the captured node, so it has to be filtered out here
          filter: n => !n?.dataset || n.dataset.noExport === undefined
        })
        const a = document.createElement('a')
        a.href = png
        a.download = `${slug}-${String(i + 1).padStart(2, '0')}.png`
        a.click()
        await new Promise(r => setTimeout(r, 400))
      }
    } catch (e) {
      setErr('Export failed: ' + e.message)
    } finally {
      setDownloading(false)
    }
  }

  return { downloading, downloadAll }
}
