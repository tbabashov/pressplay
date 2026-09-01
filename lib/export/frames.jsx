'use client'

import React, { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { styleOf } from './styles.js'
import { ratingColor, scoreText, SCALE_ROWS, fmtRuntime, fmtDuration } from '../rating-colors.js'
import { NA, fmtScore } from '../rating-scale.js'
import {
  FrameShell, Surface, ScoreChip, FitText, Fill, surfaceStyle, rowRule,
  CONTENT_W, CONTENT_H, trackTextSize, featureDrop, useUniformFit
} from './shell.jsx'

// ---------- Frame 1: Title card ----------

// The crystal dome the artist cut-outs stand in. Always glass — unlike the
// content surfaces, this one isn't part of the beta theme.
// The rim and sheen do all the work — no backdrop-filter, for the same reason
// as surfaceStyle: it rasterises as a huge misplaced blur in the export.
const DOME = {
  background: [
    'radial-gradient(120% 80% at 50% 0%, rgba(var(--ink-rgb), 0.30) 0%, rgba(var(--ink-rgb), 0.10) 42%, rgba(var(--ink-rgb), 0.03) 72%)',
    'linear-gradient(180deg, rgba(var(--ink-rgb), 0.16) 0%, rgba(var(--ink-rgb), 0.06) 55%, rgba(var(--ink-rgb), 0.02) 100%)'
  ].join(', '),
  border: '3px solid rgba(var(--ink-rgb), 0.42)',
  borderBottom: 'none',
  boxShadow: [
    'inset 0 3px 0 rgba(var(--ink-rgb), 0.6)',
    'inset 0 0 120px rgba(var(--ink-rgb), 0.10)',
    '0 -26px 90px rgba(0,0,0,0.34)'
  ].join(', ')
}

// Where each cut-out sits when the user hasn't nudged it: one centred, two
// flanking the middle, three spread across the dome.
const SPREAD = { 1: [0], 2: [-215, 215], 3: [-300, 0, 300] }
const spreadFor = (n, i) => (SPREAD[n] || SPREAD[3])[i] ?? (i - (n - 1) / 2) * 260

export const CUTOUT_BASE_H = 520
// A floor of 0.05 meant one clumsy drag could shrink a cut-out to a speck too
// small to grab hold of again, with no way back except knowing about the double
// click. Bounded at both ends now: it can still be a third of its size or three
// and a half times it, which is far more range than the dome can use.
const clampScale = v => Math.min(3.5, Math.max(0.3, v))
const round2 = v => Math.round(v * 100) / 100

const HANDLE = 56 // frame pixels — the preview is ~0.27 scale, so ~15px on screen
const CORNERS = [[0, 0], [1, 0], [0, 1], [1, 1]]

// A cut-out that can be dragged and scaled straight on the preview. Unlocked it
// gets a transform box with corner handles; those carry data-no-export so the
// PNG capture filters them out — the cut-out itself lives inside the node
// html-to-image serialises, so nothing decorative may survive into the export.
function ArtistCutout ({ img, index, count, onChange, locked }) {
  const wrap = useRef(null)
  const drag = useRef(null)
  const live = useRef(img)
  live.current = img
  const editable = !!onChange && !locked
  // Only the cut-out you are working on shows its handles and answers the
  // wheel. Every cut-out grabbing the wheel meant the page could not be
  // scrolled past one, and four sets of handles on one slide read as clutter.
  const [active, setActive] = useState(false)
  // The picture's own proportions, read off the file once it has loaded. The
  // box needs an explicit width: left is a percentage and right is auto, so an
  // auto width is shrink to fit against "containing block minus left", and a
  // cut-out dragged or grown towards the right edge had its box clamped to a
  // sliver while the picture overflowed it. The dashed border, the handles and
  // the width the resize maths reads all collapsed with it.
  const [aspect, setAspect] = useState(null)

  useEffect(() => {
    if (!editable) setActive(false)
  }, [editable])

  // Screen pixels to frame pixels. The preview is CSS scaled, and offsetHeight
  // can be 0 for a frame while the image is still loading, which would divide
  // to Infinity and leave the cut-out refusing to move until a reload.
  const frameScale = el => {
    const raw = el.getBoundingClientRect().height / (el.offsetHeight || 1)
    return Number.isFinite(raw) && raw > 0.01 ? raw : 1
  }

  useEffect(() => {
    const el = wrap.current
    if (!el || !editable || !active) return
    // React's synthetic wheel handler cannot preventDefault, so the page would
    // scroll away underneath the gesture; bind it natively instead.
    const onWheel = e => {
      e.preventDefault()
      const cur = live.current.scale ?? 1
      onChange(index, { scale: round2(clampScale(cur * (1 - e.deltaY * 0.0015))) })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [index, onChange, editable, active])

  // Clicking anywhere else puts the handles away.
  useEffect(() => {
    if (!active) return
    const away = e => { if (!wrap.current?.contains(e.target)) setActive(false) }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [active])

  function startMove (e) {
    const el = wrap.current
    setActive(true)
    el.focus?.()
    drag.current = {
      kind: 'move', id: e.pointerId, sx: e.clientX, sy: e.clientY,
      x: img.x ?? 0, y: img.y ?? 0, s: frameScale(el)
    }
    el.setPointerCapture(e.pointerId)
    e.preventDefault()
  }

  function startResize (e, fx, fy) {
    const el = wrap.current
    const r = el.getBoundingClientRect()
    const s = frameScale(el)
    // The handles are named by the edge they sit on: fx 0 is the left side,
    // fy 0 is the top. Resizing anchors the opposite corner, the way every
    // image editor does.
    const cx = fx ? r.x : r.x + r.width
    const cy = fy ? r.y : r.y + r.height
    const vx = e.clientX - cx
    const vy = e.clientY - cy
    const d0 = Math.max(24, Math.hypot(vx, vy))
    drag.current = {
      kind: 'resize', id: e.pointerId, fx, fy, cx, cy, d0,
      // The pointer is projected onto the diagonal it was grabbed on, so a
      // drag across the box scales it and a drag along the box's own edge
      // barely does. Raw distance from the anchor grew on any movement at
      // all, including the ones meant to be moving nothing.
      ux: vx / d0, uy: vy / d0,
      scale: img.scale ?? 1, x: img.x ?? 0, y: img.y ?? 0,
      // Frame pixel geometry at the moment of the grab, so the anchored
      // corner can be held still while the size changes.
      w: r.width / s, h: r.height / s
    }
    el.setPointerCapture(e.pointerId)
    e.stopPropagation()
    e.preventDefault()
  }

  function onPointerMove (e) {
    const d = drag.current
    if (!d || d.id !== e.pointerId) return
    if (d.kind === 'move') {
      onChange(index, {
        x: Math.round(d.x + (e.clientX - d.sx) / d.s),
        y: Math.round(d.y - (e.clientY - d.sy) / d.s) // bottom-anchored: down is less
      })
      return
    }

    const proj = (e.clientX - d.cx) * d.ux + (e.clientY - d.cy) * d.uy
    const scale = clampScale(d.scale * Math.max(0.05, proj / d.d0))
    // The box is laid out from its bottom centre, so growing it moves both the
    // corner under the cursor and the one opposite. Position is corrected by
    // the difference, which is what keeps the anchored corner where it was and
    // the grabbed corner under the pointer instead of sliding away from it.
    const k = scale / d.scale
    const w = d.w * k
    const h = d.h * k
    onChange(index, {
      scale: round2(scale),
      x: Math.round(d.fx ? d.x + (w - d.w) / 2 : d.x + (d.w - w) / 2),
      y: Math.round(d.fy ? d.y + d.h - h : d.y)
    })
  }

  // Arrow keys for the last few pixels, which a mouse cannot place on a preview
  // this small, and a reset that does not depend on knowing about double click.
  function onKeyDown (e) {
    if (!editable) return
    const step = e.shiftKey ? 24 : 4
    const move = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key]
    if (move) {
      e.preventDefault()
      onChange(index, { x: (img.x ?? 0) + move[0], y: (img.y ?? 0) + move[1] })
      return
    }
    if (e.key === '+' || e.key === '=' || e.key === '-') {
      e.preventDefault()
      const by = e.key === '-' ? 0.94 : 1.06
      onChange(index, { scale: round2(clampScale((img.scale ?? 1) * by)) })
    }
    if (e.key === 'Escape') setActive(false)
  }

  const showChrome = editable && active

  return (
    <div
      ref={wrap}
      tabIndex={editable ? 0 : undefined}
      onFocus={editable ? () => setActive(true) : undefined}
      onPointerDown={editable ? startMove : undefined}
      onPointerMove={editable ? onPointerMove : undefined}
      onPointerUp={editable ? e => { if (drag.current?.id === e.pointerId) drag.current = null } : undefined}
      onKeyDown={editable ? onKeyDown : undefined}
      onDoubleClick={editable ? () => onChange(index, { x: 0, y: 0, scale: 1 }) : undefined}
      style={{
        position: 'absolute',
        left: `calc(50% + ${spreadFor(count, index) + (img.x ?? 0)}px)`,
        bottom: 24 + (img.y ?? 0),
        transform: 'translateX(-50%)',
        // height drives the size and width follows the aspect ratio, so scaling
        // up always makes the picture bigger instead of padding the box
        height: Math.round(CUTOUT_BASE_H * (img.scale ?? 1)),
        width: aspect ? Math.round(CUTOUT_BASE_H * (img.scale ?? 1) * aspect) : undefined,
        cursor: editable ? 'grab' : undefined,
        outline: 'none',
        touchAction: editable ? 'none' : undefined
      }}
    >
      <img
        src={img.src} alt="" draggable={false}
        onLoad={e => {
          const { naturalWidth: w, naturalHeight: h } = e.currentTarget
          if (w && h) setAspect(w / h)
        }}
        style={{
          display: 'block', height: '100%', width: aspect ? '100%' : 'auto',
          filter: 'drop-shadow(0 34px 56px rgba(0,0,0,0.55))'
        }}
      />
      {editable && !active && (
        // A quiet outline so an untouched cut-out still reads as something you
        // are allowed to pick up, without four handles shouting on every slide.
        <div data-no-export="1" style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          border: '4px dashed rgba(var(--ink-rgb), 0.34)'
        }} />
      )}
      {showChrome && (
        <>
          <div data-no-export="1" style={{
            position: 'absolute', inset: 0, pointerEvents: 'none',
            border: '5px dashed rgba(var(--ink-rgb), 0.9)',
            boxShadow: '0 0 0 3px rgba(0,0,0,0.45), inset 0 0 0 3px rgba(0,0,0,0.45)'
          }} />
          {CORNERS.map(([fx, fy]) => (
            <div
              key={`${fx}${fy}`} data-no-export="1"
              onPointerDown={e => startResize(e, fx, fy)}
              style={{
                position: 'absolute',
                // tucked just inside the corners rather than centred on them:
                // the cut-out is anchored to the frame's bottom edge, so
                // handles straddling the corner get clipped away by the frame
                left: fx ? undefined : 0,
                right: fx ? 0 : undefined,
                top: fy ? undefined : 0,
                bottom: fy ? 0 : undefined,
                width: HANDLE, height: HANDLE, borderRadius: 12,
                background: 'var(--ink)', border: '5px solid rgba(0,0,0,0.55)',
                cursor: fx === fy ? 'nwse-resize' : 'nesw-resize',
                touchAction: 'none'
              }}
            />
          ))}
        </>
      )}
    </div>
  )
}

export function TitleFrame ({ data, palette, theme, images, onImageChange, lockCutouts }) {
  const { album } = data.review
  const cutouts = images || data.review.artistImages || []

  return (
    <FrameShell palette={palette} theme={theme} fullBleed>
      {theme?.dome !== false && styleOf(theme).dome !== false && (
        <div style={{
          position: 'absolute', left: '50%', bottom: -12, transform: 'translateX(-50%)',
          width: 950, height: 470, borderRadius: '475px 475px 0 0', ...DOME
        }} />
      )}

      {cutouts.map((img, i) => (
        <ArtistCutout
          key={i} img={img} index={i} count={cutouts.length}
          onChange={onImageChange} locked={lockCutouts || img.locked}
        />
      ))}

      {/* The album number and cover sit a touch lower, while the credits below
          close up towards the cover — the title's two-line box already carries
          plenty of air, so the gap under the artwork can afford to tighten. */}
      <div style={{
        position: 'relative', display: 'flex', flexDirection: 'column',
        alignItems: 'center', textAlign: 'center', padding: '274px 90px 0'
      }}>
        <div style={{
          fontSize: 50, fontWeight: 'var(--label-weight)', letterSpacing: 'var(--label-track)', textTransform: 'var(--label-case)',
          color: palette.accent, marginBottom: 52
        }}>
          Album #{data.albumNumber}
        </div>
        <img
          src={album.coverProxied} alt=""
          style={{ width: 640, height: 640, borderRadius: 36, objectFit: 'cover', boxShadow: '0 50px 120px rgba(0,0,0,0.65)' }}
        />
        <FitText
          size={66} min={44} lines={2} weight={800} fitKey={album.name}
          style={{ letterSpacing: -1.5, marginTop: 22, width: 880, textAlign: 'center' }}
        >
          {album.name}
        </FitText>
        <FitText
          size={42} min={28} weight={600} fitKey={album.artists.join(', ')}
          style={{ color: 'rgba(var(--ink-rgb), 0.78)', marginTop: 10, width: 880, textAlign: 'center' }}
        >
          {album.artists.join(', ')}
        </FitText>
        <div style={{ fontSize: 32, fontWeight: 600, color: palette.accent, marginTop: 10 }}>
          {[album.year, album.genre].filter(Boolean).join(' · ')}
        </div>
      </div>
    </FrameShell>
  )
}

// ---------- Shared header for the track / criteria frames ----------
// No rating chip any more: the final score has its own frame now, which is what
// frees up the width for full song titles and artist credits.
function Header ({ album, palette, theme, subtitle }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 32, marginBottom: 34 }}>
      <img src={album.coverProxied} alt="" style={{ width: 168, height: 168, borderRadius: 'var(--cover-radius)', objectFit: 'cover', boxShadow: '0 20px 60px rgba(0,0,0,0.55)', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <FitText size={48} min={30} weight={800} fitKey={album.name}
          style={{ letterSpacing: 'var(--display-track)', fontWeight: 'var(--display-weight)' }}>
          {album.name}
        </FitText>
        <FitText size={32} min={22} weight={600} fitKey={album.artists.join(', ')} style={{ color: 'rgba(var(--ink-rgb), 0.72)', marginTop: 8 }}>
          {album.artists.join(', ')}
        </FitText>
        <div style={{ fontSize: 25, fontWeight: 600, color: palette.accent, marginTop: 7 }}>
          {subtitle || [
            album.year, album.genre, `${album.tracks.length} songs`,
            // Discogs tracklists carry no durations — "0 min" is worse than nothing
            album.runtimeMs > 0 && fmtRuntime(album.runtimeMs)
          ].filter(Boolean).join(' · ')}
        </div>
      </div>
    </div>
  )
}

// ---------- Rating scale legend (optional) ----------
// Thirteen tiers across one row left each cell about 59px, which chopped
// "Majestic" to "Majes…". They wrap onto two rows of generous cells instead,
// and the labels share one size that fits the longest of them.
// Two rows of seven, as a grid rather than wrapped flex. Wrapping was one
// pixel away from fitting seven per row, so the glass theme's 3px border tipped
// it into a third row — 65px taller than budgeted, which is what pushed the
// legend over the bottom safe line.
export const LEGEND_COLS = 7
export const LEGEND_H = 168

export function ScaleLegend ({ tierLabels, theme, style }) {
  const labelRefs = useRef([])
  const tiers = [...SCALE_ROWS, NA]
  const labelSize = useUniformFit(
    labelRefs, 15, 10,
    [tiers.map(s => tierLabels[s] || '').join('|')]
  )
  return (
    <Surface theme={theme} radius={24} style={{
      display: 'grid', gridTemplateColumns: `repeat(${LEGEND_COLS}, 1fr)`,
      gap: 8, padding: '16px 18px', flexShrink: 0, ...style
    }}>
      {tiers.map((s, i) => {
        const c = ratingColor(s)
        return (
          <div key={s} style={{ minWidth: 0 }}>
            <div style={{
              height: 38, borderRadius: 9, background: c.bg, color: c.fg,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 19, fontWeight: 800
            }}>{scoreText(s)}</div>
            <div
              ref={el => { labelRefs.current[i] = el }}
              style={{
                fontSize: labelSize, fontWeight: 600, color: 'rgba(var(--ink-rgb), 0.65)',
                marginTop: 5, textAlign: 'center', whiteSpace: 'nowrap', overflow: 'hidden'
              }}
            >
              {tierLabels[s] || ''}
            </div>
          </div>
        )
      })}
    </Surface>
  )
}

// ---------- Frame 2+: the song ratings ----------

// `n` is how many guest names still fit; the rest collapse into "& more"
// rather than being cut off.
const featLabel = (features, n) => n >= features.length
  ? ` ft. ${features.join(', ')}`
  : ` ft. ${features.slice(0, n).join(', ')} & more`

// The whole tracklist shares one title size and one feature size — a single
// monster credit must never leave one row typeset differently from its
// neighbours. So an overlong row has its guest list trimmed first, and only if
// a row still won't fit does the size step down for every row at once.
function TrackRows ({ tracks, ratings, rowH, baseSize, drop, chip, theme }) {
  const boxes = useRef([])
  const feats = useRef([])
  const [fs, setFs] = useState(baseSize)
  const [counts, setCounts] = useState(() => tracks.map(t => t.features.length))
  const key = tracks.map(t => `${t.id}:${t.name}:${t.features.join(',')}`).join('|')

  useLayoutEffect(() => {
    const floor = Math.round(baseSize * 0.7)
    let size = baseSize
    let next = tracks.map(t => t.features.length)

    for (let pass = 0; pass < 12; pass++) {
      boxes.current.forEach(el => el && (el.style.fontSize = `${size}px`))
      feats.current.forEach(el => el && (el.style.fontSize = `${size - drop}px`))

      // tightest ratio of room available to room needed, across every row
      let worst = 1
      next = tracks.map((t, i) => {
        const el = boxes.current[i]
        const f = feats.current[i]
        if (!el) return t.features.length
        const over = () => el.scrollWidth > el.clientWidth + 1
        let n = t.features.length
        if (f) {
          f.textContent = featLabel(t.features, n)
          while (n > 1 && over()) f.textContent = featLabel(t.features, --n)
        }
        if (over()) worst = Math.min(worst, el.clientWidth / el.scrollWidth)
        return n
      })

      if (worst === 1 || size <= floor) break
      // round down to the next half-pixel so each pass always makes progress
      size = Math.max(floor, Math.floor((size * worst - 0.25) * 2) / 2)
    }

    setFs(size)
    setCounts(next)
  }, [key, baseSize, drop])

  const row = styleOf(theme).row || {}

  return tracks.map((t, i) => (
    <div key={t.id} style={{
      display: 'flex', alignItems: 'center', gap: row.leaders ? 12 : 20, height: rowH,
      borderBottom: i < tracks.length - 1 ? rowRule(theme) : 'none'
    }}>
      <span style={{
        width: 42, textAlign: 'right', fontSize: fs - 6, flexShrink: 0,
        color: 'rgba(var(--ink-rgb), 0.42)', fontWeight: row.weight ?? 600,
        fontVariantNumeric: 'tabular-nums'
      }}>
        {t.trackNumber}
      </span>
      <div
        ref={el => { boxes.current[i] = el }}
        style={{
          flex: row.leaders ? '0 1 auto' : 1, minWidth: 0, fontSize: fs,
          fontWeight: row.weight ?? 600,
          textTransform: row.case === 'uppercase' ? 'uppercase' : 'none',
          letterSpacing: row.case === 'uppercase' ? 0.5 : 'normal',
          lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden'
        }}
      >
        {t.name}
        {t.features.length > 0 && (
          <span
            ref={el => { feats.current[i] = el }}
            style={{ fontSize: fs - drop, fontWeight: 500, color: 'rgba(var(--ink-rgb), 0.48)' }}
          >
            {featLabel(t.features, counts[i] ?? t.features.length)}
          </span>
        )}
      </div>
      {row.leaders && (
        <span aria-hidden="true" style={{
          flex: 1, minWidth: 24, alignSelf: 'flex-end', marginBottom: fs * 0.34,
          borderBottom: '2px dotted rgba(var(--ink-rgb), 0.34)'
        }} />
      )}
      <ScoreChip score={ratings[t.id] ?? null} theme={theme} size={chip.size} fontSize={chip.fontSize} />
    </div>
  ))
}

const HEADER_H = 202 // cover block plus its margin
const SURFACE_PAD = 44

// `dense` is decided once for the whole album, not per page, so every song
// image in a set is typeset identically.
export function TracksFrame ({ data, palette, theme, tracks, showScale, dense }) {
  const { review, tierLabels } = data
  const { album } = review

  // Rows shrink to fit whatever is left of the frame, so a hand-typed count of
  // 25 songs — or a page that also carries the scale legend — still lands
  // inside the safe area instead of running off the bottom. SAFETY keeps a
  // deliberate margin so rounding can never nudge the last row over the line.
  const SAFETY = 12
  const room = CONTENT_H - HEADER_H - SURFACE_PAD - SAFETY - (showScale ? LEGEND_H + 24 : 0)
  const rowH = Math.max(28, Math.min(dense ? 60 : 68, Math.floor(room / Math.max(1, tracks.length))))
  const baseSize = Math.max(13, Math.min(trackTextSize(theme, dense), rowH - 22))
  const chipSize = Math.max(28, Math.min(dense ? 42 : 46, rowH - 14))

  return (
    <FrameShell palette={palette} theme={theme}>
      <Header album={album} palette={palette} theme={theme} />

      <Fill theme={theme} gap={24}>
        {tracks.length > 0 && (
          <Surface theme={theme} radius={30} style={{ padding: dense ? '18px 30px' : '22px 32px', flexShrink: 0 }}>
            <TrackRows
              tracks={tracks} ratings={review.ratings} theme={theme}
              rowH={rowH} baseSize={baseSize} drop={featureDrop(theme)}
              chip={{ size: chipSize, fontSize: Math.round(chipSize * 0.59) }}
            />
          </Surface>
        )}

        {showScale && <ScaleLegend tierLabels={tierLabels} theme={theme} />}
      </Fill>
    </FrameShell>
  )
}

// ---------- Frame 3: criteria, now playing, best/worst, final rating ----------

function CriterionRow ({ part, theme, last }) {
  const has = typeof part.value === 'number'
  const c = ratingColor(has ? Math.round(part.value) : null)
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 20, height: 62,
      borderBottom: last ? 'none' : rowRule(theme)
    }}>
      <span style={{ width: 258, fontSize: 27, fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap' }}>
        {part.label}
      </span>
      <div style={{
        flex: 1, height: 20, borderRadius: 10,
        background: theme?.glass ? 'rgba(var(--ink-rgb), 0.14)' : 'rgba(var(--ink-rgb), 0.09)',
        overflow: 'hidden'
      }}>
        <div style={{
          width: `${has ? Math.max(3, (part.value / 11) * 100) : 0}%`,
          height: '100%', borderRadius: 10, background: c.bg
        }} />
      </div>
      <span style={{
        width: 76, textAlign: 'right', fontSize: 32, fontWeight: 800,
        fontVariantNumeric: 'tabular-nums', color: has ? 'var(--ink)' : 'rgba(var(--ink-rgb), 0.35)',
        flexShrink: 0
      }}>
        {has ? part.value.toFixed(1) : '—'}
      </span>
    </div>
  )
}

// Apple-style glass player for the song picked to soundtrack the video.
function NowPlaying ({ track, album, palette, theme }) {
  const dur = track.durationMs || 0
  const at = Math.round(dur * 0.38)
  const icon = { fill: 'var(--ink)' }
  return (
    <div style={{ ...surfaceStyle(theme, { radius: 34 }), padding: '24px 30px 26px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
        <img src={album.coverProxied} alt="" style={{ width: 108, height: 108, borderRadius: 20, objectFit: 'cover', boxShadow: '0 14px 34px rgba(0,0,0,0.5)', flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 'var(--label-weight)', letterSpacing: 'var(--label-track)', textTransform: 'var(--label-case)', color: palette.accent, marginBottom: 7 }}>
            Now Playing
          </div>
          <FitText size={34} min={22} weight={700} fitKey={track.name}>{track.name}</FitText>
          <FitText
            size={24} min={17} weight={500}
            fitKey={[...album.artists, ...track.features].join(',')}
            style={{ color: 'rgba(var(--ink-rgb), 0.62)', marginTop: 4 }}
          >
            {[...album.artists, ...track.features].join(', ')}
          </FitText>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 20 }}>
        {/* Discogs tracklists have no durations, so the clock is dropped
            rather than showing a player stuck at 0:00 */}
        {dur > 0 && (
          <span style={{ fontSize: 19, fontWeight: 600, color: 'rgba(var(--ink-rgb), 0.6)', fontVariantNumeric: 'tabular-nums', width: 62 }}>
            {fmtDuration(at)}
          </span>
        )}
        <div style={{ flex: 1, height: 8, borderRadius: 4, background: 'rgba(var(--ink-rgb), 0.2)', position: 'relative' }}>
          <div style={{ width: '38%', height: '100%', borderRadius: 4, background: 'rgba(var(--ink-rgb), 0.92)' }} />
          <div style={{
            position: 'absolute', left: '38%', top: '50%', width: 20, height: 20,
            marginLeft: -10, marginTop: -10, borderRadius: '50%', background: 'var(--ink)',
            boxShadow: '0 3px 10px rgba(0,0,0,0.45)'
          }} />
        </div>
        {dur > 0 && (
          <span style={{ fontSize: 19, fontWeight: 600, color: 'rgba(var(--ink-rgb), 0.6)', fontVariantNumeric: 'tabular-nums', width: 62, textAlign: 'right' }}>
            -{fmtDuration(Math.max(0, dur - at))}
          </span>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 54, marginTop: 16 }}>
        <svg width="34" height="30" viewBox="0 0 34 30"><path {...icon} d="M4 3v24h4V17l14 10V3L8 13V3z" /></svg>
        <svg width="30" height="36" viewBox="0 0 30 36"><path {...icon} d="M4 2h8v32H4zM18 2h8v32h-8z" /></svg>
        <svg width="34" height="30" viewBox="0 0 34 30"><path {...icon} d="M30 3v24h-4V17L12 27V3l14 10V3z" /></svg>
      </div>
    </div>
  )
}

function Superlative ({ label, value, tone, theme }) {
  return (
    <Surface theme={theme} radius={26} style={{ padding: '18px 24px', flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 18, fontWeight: 'var(--label-weight)', letterSpacing: 'var(--label-track)', textTransform: 'var(--label-case)', color: tone }}>{label}</div>
      <FitText size={30} min={19} weight={700} fitKey={value} style={{ marginTop: 6 }}>{value}</FitText>
    </Surface>
  )
}

export function CriteriaFrame ({ data, palette, theme }) {
  const { review, parts, final, tierLabels } = data
  const { album } = review
  const sel = review.selections || {}
  const nowTrack = album.tracks.find(t => t.id === review.nowPlaying)
  const c = ratingColor(typeof final === 'number' ? Math.round(final) : null)
  const tier = typeof final === 'number' ? (tierLabels[Math.round(final)] || '') : ''

  return (
    <FrameShell palette={palette} theme={theme}>
      <Header
        album={album} palette={palette} theme={theme}
        subtitle={[album.year, album.genre].filter(Boolean).join(' · ')}
      />

      <Surface theme={theme} radius={30} style={{ padding: '10px 30px', flexShrink: 0 }}>
        {parts.map((p, i) => (
          <CriterionRow key={p.key} part={p} theme={theme} last={i === parts.length - 1} />
        ))}
      </Surface>

      {(sel.bestSong || sel.worstSong) && (
        <div style={{ display: 'flex', gap: 18, marginTop: 20 }}>
          {sel.bestSong && <Superlative label="Best Song" value={sel.bestSong} tone="#6ee7a0" theme={theme} />}
          {sel.worstSong && <Superlative label="Worst Song" value={sel.worstSong} tone="#f97316" theme={theme} />}
        </div>
      )}

      {nowTrack && <div style={{ marginTop: 20 }}><NowPlaying track={nowTrack} album={album} palette={palette} theme={theme} /></div>}

      <Surface theme={theme} radius={36} style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 28, padding: '26px 38px', flexShrink: 0, marginTop: 20
      }}>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 26, fontWeight: 'var(--label-weight)', letterSpacing: 'var(--label-track)', textTransform: 'var(--label-case)', color: palette.accent }}>
            Final Rating
          </div>
          <div style={{ fontSize: 40, fontWeight: 700, color: 'rgba(var(--ink-rgb), 0.82)', marginTop: 6 }}>{tier}</div>
        </div>
        <span style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          minWidth: 300, height: 172, padding: '0 34px', borderRadius: 46,
          fontSize: 116, fontWeight: 800, letterSpacing: -3,
          background: c.bg, color: c.fg,
          boxShadow: c.glow ? `0 0 110px ${c.glow}` : '0 22px 50px rgba(0,0,0,0.4)',
          fontVariantNumeric: 'tabular-nums', flexShrink: 0
        }}>
          {fmtScore(final)}
        </span>
      </Surface>

      {/* the score sits directly under the player; any slack falls below it */}
      <div style={{ flex: 1, minHeight: 0 }} />
    </FrameShell>
  )
}

// ---------- Frame 4: where this album ranks ----------
function RankRow ({ entry, highlight, palette, theme, artistRef, artistSize }) {
  const base = surfaceStyle(theme, { radius: 26, tint: 0.06, lift: highlight ? 0.09 : 0 })
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 20,
      ...base,
      border: highlight ? `3px solid ${palette.accent}` : (base.border || '3px solid transparent'),
      // the accent alone can sit very close to the background's own hue, so the
      // highlighted row also gets a lifted fill, a white rim and a soft halo
      boxShadow: highlight
        ? [
            'inset 0 0 0 1.5px rgba(var(--ink-rgb), 0.28)',
            `0 0 44px ${palette.accentGlow}`,
            base.boxShadow
          ].filter(Boolean).join(', ')
        : base.boxShadow,
      padding: '18px 24px'
    }}>
      {/* fixed, centred column: #7 and #140 occupy exactly the same space, so a
          three-digit rank can't shunt the row's contents sideways */}
      <span style={{
        width: 112, flexShrink: 0, textAlign: 'center',
        fontSize: 44, fontWeight: 800, letterSpacing: -1,
        color: highlight ? palette.accent : 'rgba(var(--ink-rgb), 0.55)',
        fontVariantNumeric: 'tabular-nums'
      }}>
        #{entry.rank}
      </span>
      <img src={entry.coverProxied} alt="" style={{ width: 112, height: 112, borderRadius: 20, objectFit: 'cover', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <FitText size={34} min={21} lines={2} weight={700} fitKey={entry.album.name}>
          {entry.album.name}
        </FitText>
        {/* every credit on the ladder shares one size — see useUniformFit */}
        <div
          ref={artistRef}
          style={{
            fontSize: artistSize, fontWeight: 500, color: 'rgba(var(--ink-rgb), 0.6)',
            marginTop: 4, whiteSpace: 'nowrap', overflow: 'hidden', lineHeight: 1.2
          }}
        >
          {entry.album.artists.join(', ')}
        </div>
      </div>
      <ScoreChip score={entry.rating} theme={theme} size={62} fontSize={33} decimals={1} minWidth={110} />
    </div>
  )
}

export function ComparisonFrame ({ data, palette, theme }) {
  const { review, rank, totalRanked, ladder } = data
  const artistRefs = useRef([])
  const rows = ladder.filter(e => !e.gap)
  // stable slot per row: a ref callback fires again on every re-render, so the
  // index has to come from the data rather than a running counter
  const slot = new Map(rows.map((e, i) => [e.albumId, i]))
  const artistSize = useUniformFit(
    artistRefs, 24, 20,
    [rows.map(e => e.album.artists.join(',')).join('|')]
  )
  return (
    <FrameShell palette={palette} theme={theme}>
      <div style={{ textAlign: 'center', marginBottom: 44 }}>
        <div style={{ fontSize: 34, fontWeight: 700, letterSpacing: 5, textTransform: 'uppercase', color: palette.accent }}>
          Where It Ranks
        </div>
        <div style={{ fontSize: 86, fontWeight: 800, letterSpacing: -2, marginTop: 12 }}>
          #{rank} <span style={{ fontSize: 44, fontWeight: 600, color: 'rgba(var(--ink-rgb), 0.5)' }}>of {totalRanked} albums</span>
        </div>
      </div>

      <Fill theme={theme} gap={16}>
        {ladder.map((entry, i) => entry.gap ? (
          <div key={`gap-${i}`} style={{ textAlign: 'center', fontSize: 40, fontWeight: 800, letterSpacing: 14, color: 'rgba(var(--ink-rgb), 0.35)', lineHeight: '30px' }}>
            ···
          </div>
        ) : (
          <RankRow
            key={entry.albumId} entry={entry} palette={palette} theme={theme}
            highlight={entry.albumId === review.albumId}
            artistRef={el => { artistRefs.current[slot.get(entry.albumId)] = el }}
            artistSize={artistSize}
          />
        ))}
      </Fill>
    </FrameShell>
  )
}

// ---------- Frame 5+: one artist's discography ----------
const CELL = Math.floor((CONTENT_W - 2 * 26) / 3) // 3 across the safe width

function DiscoCell ({ album, isCurrent, palette, theme }) {
  const rated = album.rated && typeof album.rating === 'number'
  return (
    <div style={{ width: CELL }}>
      <div style={{
        position: 'relative', width: CELL, height: CELL, borderRadius: 22, overflow: 'hidden',
        boxShadow: rated ? '0 18px 40px rgba(0,0,0,0.5)' : 'none',
        border: isCurrent ? `4px solid ${palette.accent}` : rated ? 'none' : '3px dashed rgba(var(--ink-rgb), 0.32)',
        background: rated ? 'transparent' : 'rgba(var(--ink-rgb), 0.05)'
      }}>
        {album.cover && (
          <img
            src={album.cover} alt=""
            style={{
              width: '100%', height: '100%', objectFit: 'cover',
              // unrated records are shown as a ghost of themselves: you can
              // tell which album it is, but it clearly hasn't been judged yet
              opacity: rated ? 1 : 0.22,
              filter: rated ? 'none' : 'grayscale(1) blur(3px)'
            }}
          />
        )}
        {!rated && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center'
          }}>
            <span style={{
              ...surfaceStyle({ glass: true }, { radius: 999 }),
              width: 92, height: 92, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 52, fontWeight: 800, color: 'rgba(var(--ink-rgb), 0.85)'
            }}>?</span>
          </div>
        )}
        {rated && (
          <div style={{ position: 'absolute', right: 10, bottom: 10 }}>
            <ScoreChip score={album.rating} theme={theme} size={54} fontSize={29} decimals={1} minWidth={98} />
          </div>
        )}
      </div>
      <FitText
        size={25} min={16} lines={2} weight={700} fitKey={album.name}
        style={{ marginTop: 10, color: rated ? 'var(--ink)' : 'rgba(var(--ink-rgb), 0.55)', textAlign: 'center' }}
      >
        {album.name}
      </FitText>
      <div style={{
        fontSize: 20, fontWeight: 600, marginTop: 2, textAlign: 'center',
        color: rated ? palette.accent : 'rgba(var(--ink-rgb), 0.38)'
      }}>
        {rated ? [album.year, `#${album.rank}`].filter(Boolean).join(' · ') : (album.year || 'Not rated yet')}
      </div>
    </div>
  )
}

export function DiscographyFrame ({ group, page, pages, currentAlbumName, palette, theme, counts }) {
  // When the list is split across pages, the header still counts the whole
  // discography rather than whatever landed on this one.
  const ratedCount = counts?.rated ?? group.albums.filter(a => a.rated).length
  const totalCount = counts?.total ?? group.albums.length
  return (
    <FrameShell palette={palette} theme={theme}>
      <div style={{ textAlign: 'center', marginBottom: 38 }}>
        <div style={{ fontSize: 28, fontWeight: 700, letterSpacing: 5, textTransform: 'uppercase', color: palette.accent }}>
          Discography{pages > 1 ? ` · ${page} / ${pages}` : ''}
        </div>
        <FitText
          size={74} min={40} weight={800} fitKey={group.artist}
          style={{ letterSpacing: -1.5, marginTop: 10 }}
        >
          {group.artist}
        </FitText>
        <div style={{ fontSize: 26, fontWeight: 600, color: 'rgba(var(--ink-rgb), 0.55)', marginTop: 8 }}>
          {ratedCount} of {totalCount} rated
        </div>
      </div>

      <Fill theme={theme}>
        {/* centred so a final row of one or two albums doesn't sit lopsided */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 26, justifyContent: 'center' }}>
          {group.albums.map(a => (
            <DiscoCell
              key={a.key} album={a} palette={palette} theme={theme}
              isCurrent={a.name === currentAlbumName}
            />
          ))}
        </div>
      </Fill>
    </FrameShell>
  )
}
