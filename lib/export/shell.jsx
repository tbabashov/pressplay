'use client'

import { styleOf } from './styles.js'
import React, { useLayoutEffect, useRef, useState } from 'react'
import { ratingColor, scoreText } from '../rating-colors.js'
import { readableInk } from '../scales.js'
import { NA } from '../rating-scale.js'

export const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', sans-serif"

export const FRAME_W = 1080
export const FRAME_H = 1920

// TikTok's chrome, measured against a 1080×1920 frame: the search bar and
// For You / Following tabs across the top, the like/comment/share rail down the
// right, and the username + caption + sound ticker along the bottom. Content
// lives strictly inside these insets, with margin to spare.
export const SAFE = { top: 300, right: 190, bottom: 270, left: 105 }

// The site's own account, as it appears on a slide. Still written out in the
// exporters as the default for somebody's own handle, which is a different
// thing that happens to start life with the same value.
export const SITE_HANDLE = '@the.press.play'
export const CONTENT_W = FRAME_W - SAFE.left - SAFE.right // 785
export const CONTENT_H = FRAME_H - SAFE.top - SAFE.bottom // 1350

export const DEFAULT_THEME = {
  gradient: false, glass: false, align: 'top', textSize: 'auto', featureDrop: 2
}

export const ALIGNMENTS = [['top', 'Top'], ['center', 'Center'], ['bottom', 'Bottom']]
const JUSTIFY = { top: 'flex-start', center: 'center', bottom: 'flex-end' }

// Song-title size for the tracklist. Auto follows how tightly packed the page
// is; the fixed picks pin it regardless. Either way the whole list shares the
// one size, the fitter only ever moves it for every row at once.
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

// Divider between rows inside a surface, brighter on glass so it survives the sheen
export const rowRule = theme => styleOf(theme).rule(theme)

// ---------- Watermark ----------
// Sits just above TikTok's bottom safe band, so it is never hidden by the
// caption rail and never collides with frame content. That is what this always
// said it did; at bottom 196 it did not, because the band is 270 deep and the
// handle was sitting 74px inside it. Written against SAFE now, so the claim and
// the number cannot drift apart again.
export function Watermark ({ handle = SITE_HANDLE }) {
  return (
    <div style={{
      position: 'absolute',
      // A line above the credit, not level with it. Both sit at the foot of the
      // safe box, and this one spans the full width to centre itself, so level
      // with the credit a long handle would run into it from the left.
      left: 0, right: 0, bottom: SAFE.bottom + 56,
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
// product being given away; a subscription takes it off.
//
// It sits in the bottom right corner of the safe box, not the frame. Pinned to
// the frame at 54 and 62 it landed at 1026 by 1858 on a 1080 by 1920 slide,
// which is 136px past the right safe edge and 208px past the bottom one —
// underneath TikTok's like, comment and share rail and its caption. A credit
// nobody can see is not a credit, and it was the only mark on a free export.
//
// It was 19px at 0.42 opacity too. On a frame 1080 wide that is under two
// percent of the width, which reads as a smudge rather than a name. Still a
// credit rather than a stamp across the work — it just has to survive being
// looked at on a phone.
export function PressPlayMark () {
  return (
    <div style={{
      position: 'absolute', right: SAFE.right, bottom: SAFE.bottom,
      display: 'flex', alignItems: 'center', gap: 12,
      pointerEvents: 'none', opacity: 0.6
    }}>
      <svg width="30" height="30" viewBox="0 0 18 18" aria-hidden="true">
        <circle cx="9" cy="9" r="8" fill="none" stroke="var(--ink)" strokeWidth="1.7" />
        <path d="M6.9 5.6v5.8l4.5-2.9z" fill="var(--ink)" />
      </svg>
      {/* Two weights, not one. "Press Play" alone was a word in the corner that
          told nobody where to find it; the whole line set in one bold shouts a
          sentence at the slide. The lead-in stays quiet and the account carries
          the weight, so what is left to read is the part worth acting on. */}
      <span style={{
        fontSize: 30, letterSpacing: 0.4, color: 'var(--ink)',
        display: 'flex', alignItems: 'baseline', gap: 8, whiteSpace: 'nowrap'
      }}>
        <span style={{ fontWeight: 500, opacity: 0.78 }}>slides made by</span>
        <span style={{ fontWeight: 750 }}>{SITE_HANDLE}</span>
      </span>
    </div>
  )
}

// ---------- Frame ----------
export function FrameShell ({ palette, theme, children, fullBleed, pad, cover }) {
  const inset = pad || SAFE
  // A picture behind the slide: the record's own cover, or one you chose. It
  // is blown up and blurred rather than fitted, because a square behind a
  // portrait frame either letterboxes or crops, and a crop of a cover is
  // rarely the part of it worth showing.
  const bgImage = theme?.background === 'cover' ? cover
    : theme?.background === 'image' ? theme?.backgroundImage
      : null
  const dim = typeof theme?.backgroundDim === 'number' ? theme.backgroundDim : 0.62
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
      {bgImage && (
        <>
          <img
            src={bgImage} alt=""
            style={{
              position: 'absolute', inset: 0, width: '100%', height: '100%',
              objectFit: 'cover',
              filter: `blur(${theme?.backgroundBlur ?? 34}px) saturate(1.15)`,
              transform: 'scale(1.16)'
            }}
          />
          {/* The scrim is what keeps a slide readable over any picture at
              all, and it has to be the style's own paper rather than always
              black: on a cream stock with dark ink a black wash makes every
              word disappear. Light ink gets a dark scrim, dark ink gets a
              pale one, so the picture sits behind the paper instead of on
              top of the type. */}
          {(() => {
            const scrim = luminance(inkFor(theme).ink) > 0.5 ? '8, 8, 11' : '246, 243, 235'
            const a = v => `rgba(${scrim}, ${Math.min(0.97, v)})`
            return (
              <div style={{
                position: 'absolute', inset: 0,
                background: `linear-gradient(180deg, ${a(dim + 0.18)} 0%, ${a(dim)} 34%, ${a(dim)} 66%, ${a(dim + 0.22)} 100%)`
              }} />
            )
          })()}
        </>
      )}

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
        // Reserve the credit's line so content cannot run under it.
        padding: fullBleed
          ? 0
          : `${inset.top}px ${inset.right}px ${inset.bottom + (theme?.watermark !== false ? 56 : 0)}px ${inset.left}px`
      }}>
        {children}
      </div>

      {theme?.showHandle !== false && theme?.handle && <Watermark handle={theme.handle} />}
      {theme?.watermark !== false && <PressPlayMark />}
    </div>
  )
}

// The variable-length body of a frame, a tracklist, a ladder, a grid, filling
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
// `lines` lines, so a long album title is never cut off with an ellipsis and
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
// How much to shrink the figure so it still fits its box as it gets longer.
//
// A chip is one size whatever is in it, so the number has to give way rather
// than the box. "10" and a dash sit at full size; a decimal place costs a
// little and a second costs more, which is what keeps 8.5 from touching the
// ring around it and 8.44 from running out of one altogether.
const FIT = { 1: 1, 2: 1, 3: 0.86, 4: 0.73, 5: 0.63 }
const fitFor = text => FIT[Math.min(5, String(text).length)] ?? 0.63

export function ScoreChip ({ score, size = 54, fontSize = 27, decimals = 0, minWidth, theme }) {
  const rounded = typeof score === 'number' ? Math.round(score) : score
  const c = ratingColor(rounded)
  const isGradient = typeof c.bg === 'string' && c.bg.startsWith('linear-gradient')
  const style = styleOf(theme)
  const kind = style.score || 'pill'
  const text = scoreText(score, decimals)
  // print, bracket and ring use the tier colour as type, so it needs contrast.
  const inkTint = isGradient ? null : readableInk(c.bg, style.ink)
  // Width, not minWidth: a row of chips where 9.5 is wider than 10 and a dash
  // is narrower than both reads as a column that will not line up, which is
  // exactly what it was.
  const fs = fontSize * fitFor(text)
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, fontVariantNumeric: 'tabular-nums'
  }

  // Printed: the figure inside a drawn ellipse, like a mark on the page.
  if (kind === 'print') {
    return (
      <span style={{
        ...base, width: minWidth || size * 1.5, height: size,
        fontSize: fs * 1.02, fontWeight: 600,
        borderRadius: '50%',
        background: c.bg, color: c.fg
      }}>{text}</span>
    )
  }

  // Poster: a hard square block with a heavy rule round it.
  if (kind === 'block') {
    return (
      <span style={{
        ...base, width: minWidth || size * 1.4, height: size,
        borderRadius: 0,
        background: c.bg, color: c.fg,
        border: '3px solid rgba(0,0,0,0.55)',
        boxShadow: '5px 5px 0 rgba(0,0,0,0.4)',
        fontSize: fs, fontWeight: 400, letterSpacing: 0.5
      }}>{text}</span>
    )
  }

  // Mono: a hairline box, squared off, in keeping with the rules elsewhere.
  if (kind === 'bracket') {
    return (
      <span style={{
        ...base, width: minWidth || size * 1.4, height: size * 0.86,
        fontSize: fs * 0.94, fontWeight: 700, letterSpacing: 0.5,
        background: c.bg, color: c.fg,
        borderRadius: 2
      }}>{text}</span>
    )
  }

  // Aurora: a lit ring round the figure, sized so the number stays readable.
  //
  // Smaller than it was. At the sizes a tracklist actually uses, the old floor
  // of 62 meant nearly every ring was the same large circle regardless of the
  // row it sat in, which read as oversized beside the text.
  if (kind === 'ring') {
    const d = Math.max(size * 1.3, 56)
    return (
      <span style={{
        ...base, width: d, height: d,
        borderRadius: '50%', fontSize: fs * 1.02, fontWeight: 700,
        color: isGradient ? '#fff' : inkTint,
        border: `2.5px solid ${isGradient ? 'rgba(255,255,255,0.85)' : inkTint}`,
        boxShadow: [
          `inset 0 0 ${d * 0.5}px ${c.glow || 'rgba(255,255,255,0.14)'}`,
          `0 0 ${d * 0.34}px ${c.glow || 'rgba(255,255,255,0.10)'}`
        ].join(', '),
        // Darker behind the figure than it was. These sit on album art as well
        // as on the page, and over a bright cover a 30% wash left the number
        // competing with whatever was underneath it.
        background: 'rgba(0,0,0,0.52)'
      }}>{text}</span>
    )
  }

  // Press Play: the pill.
  return (
    <span style={{
      ...base,
      width: minWidth || size * 1.5, height: size,
      borderRadius: size * 0.3, fontWeight: 800, fontSize: fs,
      background: c.bg, color: c.fg,
      boxShadow: c.glow
        ? `0 0 ${size * 0.6}px ${c.glow}`
        : theme?.glass ? 'inset 0 1px 0 rgba(var(--ink-rgb),0.28)' : 'none',
      border: !isGradient && theme?.glass ? '1px solid rgba(var(--ink-rgb),0.16)' : 'none'
    }}>{text}</span>
  )
}

export { NA }
