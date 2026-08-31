'use client'

import React, { useLayoutEffect, useRef, useState } from 'react'
import { ratingColor, scoreText } from '../rating-colors.js'
import { NA } from '../rating-scale.js'

export const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif"

export const FRAME_W = 1080
export const FRAME_H = 1920

// TikTok's chrome, measured against a 1080×1920 frame: the search bar and
// For You / Following tabs across the top, the like/comment/share rail down the
// right, and the username + caption + sound ticker along the bottom. Content
// lives strictly inside these insets, with margin to spare.
export const SAFE = { top: 300, right: 190, bottom: 270, left: 105 }
export const CONTENT_W = FRAME_W - SAFE.left - SAFE.right // 785
export const CONTENT_H = FRAME_H - SAFE.top - SAFE.bottom // 1350

export const DEFAULT_THEME = {
  gradient: false, glass: false, align: 'top', textSize: 'auto', featureDrop: 2
}

export const ALIGNMENTS = [['top', 'Top'], ['center', 'Center'], ['bottom', 'Bottom']]
const JUSTIFY = { top: 'flex-start', center: 'center', bottom: 'flex-end' }

// Song-title size for the tracklist. Auto follows how tightly packed the page
// is; the fixed picks pin it regardless. Either way the whole list shares the
// one size — the fitter only ever moves it for every row at once.
export const TEXT_SIZES = [['auto', 'Auto'], ['s', 'S'], ['m', 'M'], ['l', 'L']]
const TEXT_SIZE_PX = { s: 26, m: 30, l: 34 }

export function trackTextSize (theme, dense) {
  const pick = theme?.textSize || 'auto'
  return TEXT_SIZE_PX[pick] ?? (dense ? 30 : 33)
}

// How many pixels smaller the "ft. …" credit is than the song title.
export const FEATURE_DROPS = [[0, 'Same'], [2, '−2'], [4, '−4']]
export const featureDrop = theme =>
  typeof theme?.featureDrop === 'number' ? theme.featureDrop : 2

// ---------- Backgrounds ----------
// Off: the original two-stop wash. On: analogous hues pulled from the cover's
// own hue, layered as soft radial pools so the frame reads as lit rather than
// filled. Both stay dark enough for white text at any point.
export function frameBackground (palette, theme) {
  if (!theme?.gradient) {
    return `linear-gradient(180deg, ${palette.bgTop} 0%, ${palette.bgBottom} 100%)`
  }
  const h = palette.hue ?? 240
  // Only ever cap the saturation, never raise it. Extraction reports 6% for a
  // near-neutral cover, and on those the hue is sensor noise — a white sleeve
  // scans faintly blue, a black one faintly violet. Flooring saturation at 30
  // used to promote that noise into a confidently purple frame.
  const s = Math.min(64, palette.sat ?? 40)
  // every pool stays within ~25° of the cover's own hue, so the frame reads as
  // one deep colour with light moving through it rather than a rainbow
  const at = d => Math.round((h + d + 360) % 360)
  const sat = d => Math.min(76, s + d)
  return [
    `radial-gradient(74% 44% at 16% 3%, hsla(${at(15)}, ${sat(14)}%, 33%, 0.8) 0%, hsla(${at(15)}, ${s}%, 15%, 0) 64%)`,
    `radial-gradient(64% 40% at 90% 19%, hsla(${at(-17)}, ${sat(8)}%, 26%, 0.72) 0%, hsla(${at(-17)}, ${s}%, 12%, 0) 62%)`,
    `radial-gradient(92% 50% at 78% 96%, hsla(${at(14)}, ${sat(4)}%, 22%, 0.68) 0%, hsla(${at(14)}, ${s}%, 10%, 0) 66%)`,
    `radial-gradient(80% 42% at 4% 82%, hsla(${at(-8)}, ${s}%, 21%, 0.6) 0%, hsla(${at(-8)}, ${s}%, 9%, 0) 62%)`,
    `linear-gradient(168deg, hsl(${h}, ${s}%, 19%) 0%, hsl(${h}, ${s}%, 11%) 52%, hsl(${h}, ${Math.max(10, s - 12)}%, 6%) 100%)`
  ].join(', ')
}

// ---------- Surfaces ----------
// Off: the flat grey card. On: Apple-style crystal glass — a diagonal sheen, a
// bright top edge and a soft inner glow, all built from gradients and insets.
//
// Deliberately NO backdrop-filter. html-to-image serialises the DOM into an SVG
// foreignObject, and Chrome resolves the backdrop root wrongly in there: it
// paints an oversized blurred rectangle well outside the element and smears any
// text sitting above it. Declaring it only for the preview also meant the
// preview and the exported PNG disagreed, which is worse than losing the blur.
// `lift` brightens a surface above its neighbours — the crystal sheen is a
// fixed gradient rather than a flat tint, so raising `tint` alone would do
// nothing here and a highlighted row would be indistinguishable.
export function surfaceStyle (theme, { radius = 30, tint = 0.07, lift = 0 } = {}) {
  if (!theme?.glass) {
    return { background: `rgba(255,255,255,${tint + lift})`, borderRadius: radius }
  }
  const a = v => Math.round(Math.min(0.62, v + lift) * 1000) / 1000
  return {
    borderRadius: radius,
    background: `linear-gradient(148deg, rgba(255,255,255,${a(0.21)}) 0%, rgba(255,255,255,${a(0.085)}) 38%, rgba(255,255,255,${a(0.05)}) 72%, rgba(255,255,255,${a(0.105)}) 100%)`,
    border: '1.5px solid rgba(255,255,255,0.24)',
    boxShadow: [
      `inset 0 1.5px 0 rgba(255,255,255,${a(0.5)})`,
      'inset 0 -1.5px 0 rgba(255,255,255,0.09)',
      `inset 0 0 70px rgba(255,255,255,${a(0.06)})`,
      '0 26px 64px rgba(0,0,0,0.4)'
    ].join(', ')
  }
}

export function Surface ({ theme, radius, tint, lift, style, children }) {
  return (
    <div style={{ ...surfaceStyle(theme, { radius, tint, lift }), ...style }}>
      {children}
    </div>
  )
}

// One font size shared by a group of elements: the largest at which every one
// of them fits. Keeps sibling labels typeset identically instead of each
// shrinking on its own until one ends up far smaller than the rest.
export function useUniformFit (refs, size, min, deps) {
  const [fs, setFs] = useState(size)
  useLayoutEffect(() => {
    const els = refs.current.filter(Boolean)
    if (!els.length) return
    const apply = v => els.forEach(el => { el.style.fontSize = `${v}px` })
    let s = size
    apply(s)
    while (s > min && els.some(el => el.scrollWidth > el.clientWidth + 1)) apply(s -= 0.5)
    setFs(s)
  }, deps)
  return fs
}

// Divider between rows inside a surface — brighter on glass so it survives the sheen
export const rowRule = theme =>
  `1px solid rgba(255,255,255,${theme?.glass ? 0.14 : 0.08})`

// ---------- Frame ----------
export function FrameShell ({ palette, theme, children, fullBleed, pad }) {
  const inset = pad || SAFE
  return (
    <div style={{
      width: FRAME_W,
      height: FRAME_H,
      position: 'relative',
      overflow: 'hidden',
      fontFamily: FONT,
      color: '#f5f5f7',
      background: frameBackground(palette, theme),
      display: 'flex',
      flexDirection: 'column',
      WebkitFontSmoothing: 'antialiased'
    }}>
      {/* soft accent glow behind the content; the gradient theme is already
          layered, so it only needs a whisper of extra light */}
      <div style={{
        position: 'absolute', top: -300, left: '50%', transform: 'translateX(-50%)',
        width: 1400, height: 900, borderRadius: '50%',
        background: `radial-gradient(closest-side, ${palette.dominant}, transparent)`,
        opacity: theme?.gradient ? 0.22 : 0.5, filter: 'blur(40px)'
      }} />
      <div style={{
        position: 'relative', flex: 1, display: 'flex', flexDirection: 'column',
        padding: fullBleed ? 0 : `${inset.top}px ${inset.right}px ${inset.bottom}px ${inset.left}px`
      }}>
        {children}
      </div>
    </div>
  )
}

// The variable-length body of a frame — a tracklist, a ladder, a grid — filling
// whatever room is left below the header. Which end it settles against is the
// Align setting, so a short list can hang from the top, sit in the middle, or
// rest on the bottom.
export function Fill ({ theme, gap = 0, children, style }) {
  return (
    <div style={{
      flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
      justifyContent: JUSTIFY[theme?.align] || JUSTIFY.top, gap, ...style
    }}>
      {children}
    </div>
  )
}

// Rendered next to a preview (never inside the captured node) to show exactly
// which bands TikTok's own UI will sit on top of.
export function SafeZoneOverlay () {
  const band = { position: 'absolute', background: 'rgba(255,59,48,0.17)', border: '1px dashed rgba(255,59,48,0.5)' }
  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
      <div style={{ ...band, top: 0, left: 0, right: 0, height: SAFE.top }} />
      <div style={{ ...band, bottom: 0, left: 0, right: 0, height: SAFE.bottom }} />
      <div style={{ ...band, top: SAFE.top, bottom: SAFE.bottom, right: 0, width: SAFE.right }} />
      <div style={{ ...band, top: SAFE.top, bottom: SAFE.bottom, left: 0, width: SAFE.left }} />
    </div>
  )
}

// ---------- Text that always fits ----------
// Steps the font size down until the text fits its box, then wraps onto up to
// `lines` lines — so a long album title is never cut off with an ellipsis and
// never needs an abbreviation. Measured against the live DOM, which is the
// same DOM html-to-image serialises, so the preview and the PNG always agree.
export function FitText ({
  children, size, min, lines = 1, weight = 600, color, fitKey, style, title, boxHeight
}) {
  const ref = useRef(null)
  const [fs, setFs] = useState(size)
  const floor = min ?? Math.round(size * 0.62)
  // boxHeight pins the box to a row's height so wrapping can't grow the row
  const boxH = lines > 1 ? (boxHeight ?? Math.round(size * 1.16 * lines)) : undefined

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const overflows = () => lines > 1
      ? el.scrollHeight > el.clientHeight + 1
      : el.scrollWidth > el.clientWidth + 1
    let s = size
    el.style.fontSize = `${s}px`
    // half-pixel steps keep the shrink invisible next to unshrunk siblings
    while (s > floor && overflows()) {
      s -= 0.5
      el.style.fontSize = `${s}px`
    }
    setFs(s)
  }, [fitKey ?? (typeof children === 'string' ? children : ''), size, floor, lines, boxH])

  return (
    <div
      ref={ref}
      title={title}
      style={{
        fontSize: fs,
        fontWeight: weight,
        color,
        lineHeight: lines > 1 ? 1.16 : 1.2,
        height: boxH,
        overflow: 'hidden',
        whiteSpace: lines > 1 ? 'normal' : 'nowrap',
        // a 2-line box that only needs one line should sit against the top
        display: lines > 1 ? 'flex' : 'block',
        flexDirection: 'column',
        justifyContent: 'center',
        ...style
      }}
    >
      {children}
    </div>
  )
}

// ---------- Score chip ----------
export function ScoreChip ({ score, size = 54, fontSize = 27, decimals = 0, minWidth, theme }) {
  const rounded = typeof score === 'number' ? Math.round(score) : score
  const c = ratingColor(rounded)
  const isGradient = typeof c.bg === 'string' && c.bg.startsWith('linear-gradient')
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      minWidth: minWidth || size * 1.5, height: size, padding: '0 16px',
      borderRadius: size * 0.3, fontWeight: 800, fontSize,
      background: c.bg, color: c.fg,
      // the gradient tiers get their halo; the flat tiers get a glass rim so
      // they don't look pasted on when the crystal theme is on
      boxShadow: c.glow
        ? `0 0 ${size * 0.6}px ${c.glow}`
        : theme?.glass ? 'inset 0 1px 0 rgba(255,255,255,0.28)' : 'none',
      border: !isGradient && theme?.glass ? '1px solid rgba(255,255,255,0.16)' : 'none',
      fontVariantNumeric: 'tabular-nums',
      flexShrink: 0
    }}>
      {scoreText(score, decimals)}
    </span>
  )
}

export { NA }
