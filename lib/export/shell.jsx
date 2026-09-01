'use client'

import { styleOf } from './styles.js'
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
  // A colour the user picked wins outright, whatever the style: it is a
  // deliberate choice, not a guess made from the artwork.
  if (theme?.bg) {
    return theme?.gradient === false
      ? theme.bg
      : `radial-gradient(120% 90% at 50% 0%, ${theme.bg} 0%, ` +
        `color-mix(in srgb, ${theme.bg} 62%, #05050a) 58%, ` +
        `color-mix(in srgb, ${theme.bg} 34%, #040408) 100%)`
  }
  return styleOf(theme).bg(palette, theme)
}

// Ink is fixed per style, which is right until someone picks their own
// background. Choosing a pale colour on a dark style left near-white text on a
// near-white frame, which is what "it does not adjust the font colour" was.
// When a colour has been picked, the ink follows its brightness instead.
const HEX = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i
function luminance (hex) {
  const m = HEX.exec(String(hex || '').trim())
  if (!m) return null
  let h = m[1]
  if (h.length === 3) h = h.split('').map(c => c + c).join('')
  const [r, g, b] = [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255)
  // Perceived brightness, not a plain average: the eye reads green far more
  // strongly than blue, so a pure blue and a pure green of the same average
  // are nothing alike to look at.
  const lin = v => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
}

export function inkFor (theme) {
  const style = styleOf(theme)
  const l = theme?.bg ? luminance(theme.bg) : null
  if (l === null) return { ink: style.ink, inkRgb: style.inkRgb }
  return l > 0.42
    ? { ink: '#14121a', inkRgb: '20, 18, 26' }
    : { ink: '#f7f7fa', inkRgb: '255, 255, 255' }
}

export function surfaceStyle (theme, opts = {}) {
  return styleOf(theme).surface(theme, opts)
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
export const rowRule = theme => styleOf(theme).rule(theme)

// ---------- Watermark ----------
// Sits just above TikTok's bottom safe band, so it is never hidden by the
// caption rail and never collides with frame content.
export function Watermark ({ handle = '@the.press.play' }) {
  return (
    <div style={{
      position: 'absolute',
      left: 0, right: 0, bottom: 196,
      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
      pointerEvents: 'none', opacity: 0.55
    }}>
      <svg width="26" height="26" viewBox="0 0 18 18" aria-hidden="true">
        <circle cx="9" cy="9" r="8" fill="none" stroke="var(--ink)" strokeWidth="1.6" />
        <path d="M6.9 5.6v5.8l4.5-2.9z" fill="var(--ink)" />
      </svg>
      <span style={{
        fontSize: 25, fontWeight: 700, letterSpacing: 1.2, color: 'var(--ink)'
      }}>{handle}</span>
    </div>
  )
}

// The site's own credit. A free export carries it because the frames are the
// product being given away; a subscription takes it off. It is deliberately
// small and in the corner: it is a credit, not a brand stamp across the work.
export function PressPlayMark () {
  return (
    <div style={{
      position: 'absolute', right: 54, bottom: 62,
      display: 'flex', alignItems: 'center', gap: 8,
      pointerEvents: 'none', opacity: 0.42
    }}>
      <svg width="20" height="20" viewBox="0 0 18 18" aria-hidden="true">
        <circle cx="9" cy="9" r="8" fill="none" stroke="var(--ink)" strokeWidth="1.7" />
        <path d="M6.9 5.6v5.8l4.5-2.9z" fill="var(--ink)" />
      </svg>
      <span style={{
        fontSize: 19, fontWeight: 750, letterSpacing: 0.4, color: 'var(--ink)'
      }}>Press Play</span>
    </div>
  )
}

// ---------- Frame ----------
export function FrameShell ({ palette, theme, children, fullBleed, pad }) {
  const inset = pad || SAFE
  return (
    <div style={{
      width: FRAME_W,
      height: FRAME_H,
      position: 'relative',
      overflow: 'hidden',
      fontFamily: styleOf(theme).font || FONT,
      color: 'var(--ink)',
      // Every frame reads its ink from here, so one set of components renders
      // dark on cream or light on black without a second copy.
      ['--ink']: inkFor(theme).ink,
      ['--ink-rgb']: inkFor(theme).inkRgb,
      // Type voice, so each style reads differently and not just recolours.
      ['--display-weight']: styleOf(theme).type?.displayWeight ?? 800,
      ['--display-track']: styleOf(theme).type?.displayTrack ?? '-1px',
      ['--label-track']: styleOf(theme).type?.labelTrack ?? '9px',
      ['--label-case']: styleOf(theme).type?.labelCase ?? 'uppercase',
      ['--label-weight']: styleOf(theme).type?.labelWeight ?? 800,
      ['--cover-radius']: styleOf(theme).type?.coverRadius ?? '26px',
      ['--chip-radius']: styleOf(theme).type?.chipRadius ?? '999px',
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

      {theme?.showHandle !== false && theme?.handle && <Watermark handle={theme.handle} />}
      {theme?.watermark !== false && <PressPlayMark />}
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
// How a score reads is part of the design, not a colour swap: a printed page
// wants a numeral, a poster wants a block, a receipt wants a bracketed figure.
export function ScoreChip ({ score, size = 54, fontSize = 27, decimals = 0, minWidth, theme }) {
  const rounded = typeof score === 'number' ? Math.round(score) : score
  const c = ratingColor(rounded)
  const isGradient = typeof c.bg === 'string' && c.bg.startsWith('linear-gradient')
  const kind = styleOf(theme).score || 'pill'
  const text = scoreText(score, decimals)
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, fontVariantNumeric: 'tabular-nums'
  }

  // Printed: no container at all, just the figure, tinted by its tier.
  if (kind === 'print') {
    return (
      <span style={{
        ...base, minWidth: minWidth || size * 1.2, height: size,
        fontSize: fontSize * 1.24, fontWeight: 400,
        color: isGradient ? 'var(--ink)' : c.bg,
        justifyContent: 'flex-end'
      }}>{text}</span>
    )
  }

  // Poster: a hard square block with a heavy rule round it.
  if (kind === 'block') {
    return (
      <span style={{
        ...base, minWidth: minWidth || size * 1.4, height: size,
        padding: '0 12px', borderRadius: 0,
        background: c.bg, color: c.fg,
        border: '3px solid rgba(0,0,0,0.55)',
        boxShadow: '5px 5px 0 rgba(0,0,0,0.4)',
        fontSize, fontWeight: 400, letterSpacing: 0.5
      }}>{text}</span>
    )
  }

  // Receipt: a bracketed figure, colour carried by the type.
  if (kind === 'bracket') {
    return (
      <span style={{
        ...base, minWidth: minWidth || size * 1.5, height: size,
        fontSize: fontSize * 0.94, fontWeight: 600, letterSpacing: 0.5,
        color: isGradient ? 'var(--ink)' : c.bg,
        justifyContent: 'flex-end'
      }}>
        <span style={{ opacity: 0.42, marginRight: 3 }}>[</span>
        {text}
        <span style={{ opacity: 0.42, marginLeft: 3 }}>]</span>
      </span>
    )
  }

  // Aurora: a lit ring round the figure, sized so the number stays readable.
  if (kind === 'ring') {
    const d = Math.max(size * 1.42, 62)
    return (
      <span style={{
        ...base, width: d, height: d,
        borderRadius: '50%', fontSize: fontSize * 1.06, fontWeight: 700,
        color: isGradient ? '#fff' : c.bg,
        border: `2.5px solid ${isGradient ? 'rgba(255,255,255,0.85)' : c.bg}`,
        boxShadow: [
          `inset 0 0 ${d * 0.5}px ${c.glow || 'rgba(255,255,255,0.14)'}`,
          `0 0 ${d * 0.34}px ${c.glow || 'rgba(255,255,255,0.10)'}`
        ].join(', '),
        background: 'rgba(0,0,0,0.3)'
      }}>{text}</span>
    )
  }

  // Press Play: the pill.
  return (
    <span style={{
      ...base,
      minWidth: minWidth || size * 1.5, height: size, padding: '0 16px',
      borderRadius: size * 0.3, fontWeight: 800, fontSize,
      background: c.bg, color: c.fg,
      boxShadow: c.glow
        ? `0 0 ${size * 0.6}px ${c.glow}`
        : theme?.glass ? 'inset 0 1px 0 rgba(var(--ink-rgb),0.28)' : 'none',
      border: !isGradient && theme?.glass ? '1px solid rgba(var(--ink-rgb),0.16)' : 'none'
    }}>{text}</span>
  )
}

export { NA }
