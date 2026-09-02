'use client'

import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
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

// The box can never be smaller than this or larger than that, in frame pixels.
// Clamping the height rather than the scale means the limit is the same
// whatever shape the picture is, and a clamp can never invert the box the way
// letting a dragged edge cross its anchor would.
const MIN_H = 90
const MAX_H = 1750

const HANDLE = 56 // frame pixels — the preview is ~0.2 scale, so ~11px on screen
const HIT = 96    // the pointer target is larger than the thing you can see

// Handles are named by the two edges they sit on. Everything else — where they
// are drawn, which corner is anchored, which cursor is shown — is derived from
// this one description, so a handle cannot end up drawn in one place and
// anchored to another.
const HANDLES = [
  { id: 'nw', ex: 0, ey: 0, cursor: 'nwse-resize' },
  { id: 'ne', ex: 1, ey: 0, cursor: 'nesw-resize' },
  { id: 'sw', ex: 0, ey: 1, cursor: 'nesw-resize' },
  { id: 'se', ex: 1, ey: 1, cursor: 'nwse-resize' }
]

// Anything on a slide that can be taken off it. The X is chrome, so it carries
// data-no-export like the cut-out handles do and never reaches the PNG. When
// there is no handler — the render route, the full size preview, a published
// page — this is the children and nothing else, not even a wrapper.
// A cover, or the space where one would be. An <img> with an empty src makes
// the browser request the current page again — six of them on a slide deck
// meant six extra full page loads every time the frames rendered, which is
// both wrong and slow. A missing cover draws a plain block instead.
export function Cover ({ src, size, style }) {
  const base = { width: size, height: size, flexShrink: 0, ...style }
  if (!src) {
    return <div aria-hidden="true" style={{ ...base, background: 'rgba(var(--ink-rgb), 0.08)' }} />
  }
  return <img src={src} alt="" style={{ ...base, objectFit: 'cover' }} />
}

// Text you can change on the slide instead of going back a screen for it.
// contentEditable rather than an input, because the text has to keep the
// frame's own type: an input here would need every font, size and letter
// spacing copied onto it, and would still break the moment a style changed.
//
// The value is only written back on blur or Enter. Writing on every keystroke
// would put a request behind every letter, and would re-render the frame under
// the cursor while someone was still typing into it.
export function Editable ({ field, value, onEdit, multiline, children, style }) {
  const ref = useRef(null)
  if (!onEdit) return children ?? value

  const commit = () => {
    const next = (ref.current?.innerText ?? '').replace(/\s+/g, ' ').trim()
    if (next && next !== value) onEdit(field, next)
    else if (ref.current) ref.current.innerText = value   // put back what was there
  }

  return (
    <span
      ref={ref}
      className="pp-ed"
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      data-pp-edit="1"
      onPointerDown={e => e.stopPropagation()}
      onBlur={commit}
      onKeyDown={e => {
        e.stopPropagation()
        if (e.key === 'Enter' && !multiline) { e.preventDefault(); ref.current?.blur() }
        if (e.key === 'Escape') { if (ref.current) ref.current.innerText = value; ref.current?.blur() }
      }}
      style={{ outline: 'none', ...style }}
    >
      {value}
    </span>
  )
}

export function Removable ({ id, name, onRemove, children, inline, style }) {
  if (!onRemove) return children
  return (
    <div className="pp-rm" style={{ position: 'relative', display: inline ? 'inline-block' : 'block', ...style }}>
      {children}
      <button
        data-no-export="1"
        className="pp-rm-x"
        title={`Take ${name} off the slide`}
        aria-label={`Take ${name} off the slide`}
        onPointerDown={e => e.stopPropagation()}
        onClick={e => { e.preventDefault(); e.stopPropagation(); onRemove(id) }}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 6.5l11 11m0-11l-11 11"
          fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
      </button>
    </div>
  )
}

// ---- the one geometry ----------------------------------------------------
//
// What is stored on a cut-out is x, y and scale: an offset from the middle of
// the dome, a height above its floor, and a size. What a resize needs is a
// rectangle. Rather than keep both and let them drift, there is one conversion
// each way and everything else works in rectangles.
//
// host is the positioned box the cut-out lives in. Reading it live is what
// makes this correct under zoom, scrolling, a resized window and the CSS scale
// the preview is drawn at, without any of them being special cased.

const rectOf = (img, aspect, spread, host) => {
  const h = CUTOUT_BASE_H * (img.scale ?? 1)
  const w = h * aspect
  return {
    w,
    h,
    left: host.w / 2 + spread + (img.x ?? 0) - w / 2,
    top: host.h - (24 + (img.y ?? 0)) - h
  }
}

const imgOf = (rect, spread, host) => ({
  scale: rect.h / CUTOUT_BASE_H,
  x: rect.left + rect.w / 2 - host.w / 2 - spread,
  y: host.h - (rect.top + rect.h) - 24
})

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
  const spread = spreadFor(count, index)

  // Only the cut-out you are working on shows its handles and answers the
  // wheel. Every cut-out grabbing the wheel meant the page could not be
  // scrolled past one, and four sets of handles on one slide read as clutter.
  const [active, setActive] = useState(false)

  // The picture's own proportions. Read in a ref callback as well as on load,
  // because a cached image is already complete before React attaches onLoad and
  // that handler then never fires: the width stayed unknown, the box fell back
  // to shrink-to-fit against whatever room was left, and the cut-out rendered
  // as a tall thin sliver of a person.
  const [aspect, setAspect] = useState(null)
  const readAspect = useCallback(node => {
    if (!node) return
    const read = () => {
      const { naturalWidth: w, naturalHeight: h } = node
      if (w && h) setAspect(w / h)
    }
    if (node.complete) read()
    node.addEventListener('load', read)
    return () => node.removeEventListener('load', read)
  }, [])

  useEffect(() => { if (!editable) setActive(false) }, [editable])

  // Pointer coordinates into the coordinates the geometry is written in, done
  // once per event and never again. offsetParent is the box the cut-out's left
  // and top are measured against, and its rect against its own offset size is
  // the CSS scale actually applied to the preview.
  const space = () => {
    const el = wrap.current
    const host = el?.offsetParent
    if (!el || !host) return null
    // The factor between frame pixels and what is on the glass, measured off a
    // quantity this component sets itself: the box's height is exactly
    // CUTOUT_BASE_H * scale frame pixels, so its rect divided by that is the
    // factor, whatever combination of CSS scale, page zoom and layout produced
    // it. Deriving it from offsetWidth instead put the two halves of the sum in
    // different coordinate spaces the moment a page zoom was involved, and the
    // cut-out jumped hundreds of pixels on the first move.
    const frameH = CUTOUT_BASE_H * (live.current.scale ?? 1)
    const er = el.getBoundingClientRect()
    const k = frameH > 0 ? er.height / frameH : 1
    if (!Number.isFinite(k) || k <= 0.0001) return null
    // The host's own size in frame pixels, through that same factor, so the
    // rest of the geometry never touches a second coordinate system.
    const r = host.getBoundingClientRect()
    return { r, w: r.width / k, h: r.height / k, k }
  }

  const toFrame = (e, sp) => ({
    x: (e.clientX - sp.r.left) / sp.k,
    y: (e.clientY - sp.r.top) / sp.k
  })

  // One update per pointer event, carrying every field that changed together.
  // Setting the position in one render and the size in the next is what lets a
  // handle visibly come away from the picture for a frame.
  const apply = (rect, sp) => onChange(index, imgOf(rect, spread, sp))

  const begin = (e, handle) => {
    const sp = space()
    if (!sp || !aspect) return
    const rect = rectOf(live.current, aspect, spread, sp)
    const p = toFrame(e, sp)

    drag.current = {
      id: e.pointerId,
      handle,                    // locked for the whole gesture, never re-detected
      rect,                      // the geometry at the moment of the grab
      p,                         // where the pointer was, in frame coordinates
      // Where the pointer sat relative to the corner it grabbed. Without this
      // the box jumps by that much on the first move, because the corner is
      // snapped to the pointer instead of following it.
      off: handle
        ? {
            x: (handle.ex ? rect.left + rect.w : rect.left) - p.x,
            y: (handle.ey ? rect.top + rect.h : rect.top) - p.y
          }
        : { x: 0, y: 0 }
    }
    setActive(true)
    wrap.current?.focus?.()
    e.preventDefault()
    e.stopPropagation()
  }

  // Move, up and cancel live on the window for as long as a gesture is running,
  // added once and removed on the way out. On the element they missed every
  // release that happened somewhere else, and the gesture stayed live: the next
  // idle mouse movement went on dragging the cut-out across the slide with no
  // button held down.
  useEffect(() => {
    if (!editable) return
    const move = e => {
      const d = drag.current
      if (!d || d.id !== e.pointerId) return
      const sp = space()
      if (!sp) return
      const p = toFrame(e, sp)
      e.preventDefault()

      if (!d.handle) {
        apply({ ...d.rect, left: d.rect.left + (p.x - d.p.x), top: d.rect.top + (p.y - d.p.y) }, sp)
        return
      }

      const { ex, ey } = d.handle
      const r0 = d.rect
      // The corner opposite the one being dragged. It is where the new box is
      // built from, so it stays exactly where it was by construction rather
      // than by a correction applied afterwards.
      const ax = ex ? r0.left : r0.left + r0.w
      const ay = ey ? r0.top : r0.top + r0.h
      // The grabbed corner, following the pointer at the offset it was caught.
      const cx = p.x + d.off.x
      const cy = p.y + d.off.y
      // Distance from the anchor, counted positive in the direction that grows.
      const dx = ex ? cx - ax : ax - cx
      const dy = ey ? cy - ay : ay - cy

      // One factor for both axes: a cut-out is a photograph of a person, and
      // scaling the two independently is what turned them into a seven foot
      // sliver. The larger of the two demands wins, so the corner keeps up with
      // whichever way the hand is actually moving.
      const k = Math.max(dx / r0.w, dy / r0.h)
      const h = Math.min(MAX_H, Math.max(MIN_H, r0.h * k))
      const w = h * aspect

      apply({
        w,
        h,
        left: ex ? ax : ax - w,
        top: ey ? ay : ay - h
      }, sp)
    }

    const end = e => {
      const d = drag.current
      if (!d || (e.pointerId !== undefined && d.id !== e.pointerId)) return
      drag.current = null
      document.body.style.removeProperty('cursor')
    }

    window.addEventListener('pointermove', move, { passive: false })
    window.addEventListener('pointerup', end)
    window.addEventListener('pointercancel', end)
    // A gesture must not outlive the component, or the listeners it needs.
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', end)
      window.removeEventListener('pointercancel', end)
      drag.current = null
      document.body.style.removeProperty('cursor')
    }
  }, [editable, index, onChange, aspect, spread])

  useEffect(() => {
    const el = wrap.current
    if (!el || !editable || !active) return
    // React's synthetic wheel handler cannot preventDefault, so the page would
    // scroll away underneath the gesture; bind it natively instead. Scaling on
    // the wheel keeps the feet planted, which is what the stored shape does
    // when only the size changes.
    const onWheel = e => {
      e.preventDefault()
      const cur = (live.current.scale ?? 1) * CUTOUT_BASE_H
      const next = Math.min(MAX_H, Math.max(MIN_H, cur * (1 - e.deltaY * 0.0015)))
      onChange(index, { scale: next / CUTOUT_BASE_H })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [index, onChange, editable, active])

  // Clicking anywhere else puts the handles away.
  useEffect(() => {
    if (!active) return
    const away = e => {
      if (drag.current) return
      if (!wrap.current?.contains(e.target)) setActive(false)
    }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [active])

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
      const cur = (img.scale ?? 1) * CUTOUT_BASE_H
      const next = Math.min(MAX_H, Math.max(MIN_H, cur * (e.key === '-' ? 0.94 : 1.06)))
      onChange(index, { scale: next / CUTOUT_BASE_H })
    }
    if (e.key === 'Escape') setActive(false)
  }

  const showChrome = editable && active
  const h = CUTOUT_BASE_H * (img.scale ?? 1)

  return (
    <div
      ref={wrap}
      tabIndex={editable ? 0 : undefined}
      onFocus={editable ? () => setActive(true) : undefined}
      onPointerDown={editable ? e => begin(e, null) : undefined}
      onKeyDown={editable ? onKeyDown : undefined}
      onDoubleClick={editable ? () => onChange(index, { x: 0, y: 0, scale: 1 }) : undefined}
      style={{
        position: 'absolute',
        // Drawn from the stored shape by the same formula the drag converts
        // through, so what is on screen and what a gesture works on cannot
        // disagree. The handles are children of this box, which is the only
        // way to be sure they never come away from it.
        left: `calc(50% + ${spread + (img.x ?? 0)}px)`,
        bottom: 24 + (img.y ?? 0),
        transform: 'translateX(-50%)',
        height: h,
        width: aspect ? h * aspect : undefined,
        cursor: editable ? 'grab' : undefined,
        outline: 'none',
        touchAction: editable ? 'none' : undefined,
        userSelect: editable ? 'none' : undefined,
        WebkitUserSelect: editable ? 'none' : undefined
      }}
    >
      <img
        ref={readAspect}
        src={img.src} alt="" draggable={false}
        onDragStart={e => e.preventDefault()}
        style={{
          display: 'block', height: '100%', width: aspect ? '100%' : 'auto',
          // Until the proportions are known the picture is fitted rather than
          // stretched, so a first paint can letterbox but can never distort.
          objectFit: 'contain',
          pointerEvents: 'none',
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
          {HANDLES.map(hd => (
            <div
              key={hd.id} data-no-export="1"
              onPointerDown={e => { begin(e, hd); document.body.style.cursor = hd.cursor }}
              style={{
                position: 'absolute',
                // Centred on the corner they control, derived from the box
                // itself rather than nudged into place with offsets.
                left: `${hd.ex * 100}%`,
                top: `${hd.ey * 100}%`,
                transform: 'translate(-50%, -50%)',
                width: HIT, height: HIT,
                display: 'grid', placeItems: 'center',
                cursor: hd.cursor,
                touchAction: 'none',
                zIndex: 2
              }}
            >
              <span style={{
                width: HANDLE, height: HANDLE, borderRadius: 12,
                background: 'var(--ink)', border: '5px solid rgba(0,0,0,0.55)'
              }} />
            </div>
          ))}
        </>
      )}
    </div>
  )
}

export function TitleFrame ({ data, palette, theme, images, onImageChange, lockCutouts,
  hiddenParts = [], onRemovePart, onEdit }) {
  const off = id => hiddenParts.includes(id)
  const { album } = data.review
  const cutouts = images || data.review.artistImages || []

  return (
    <FrameShell palette={palette} theme={theme} fullBleed>
      {theme?.dome !== false && styleOf(theme).dome !== false && !off('dome') && (
        <Removable id="dome" name="the dome" onRemove={onRemovePart} style={{
          position: 'absolute', left: '50%', bottom: -12, transform: 'translateX(-50%)',
          width: 950, height: 470
        }}>
          <div style={{
            width: '100%', height: '100%', borderRadius: '475px 475px 0 0', ...DOME
          }} />
        </Removable>
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
        {!off('albumNumber') && (
          <Removable id="albumNumber" name="the album number" onRemove={onRemovePart}>
            <div style={{
              fontSize: 50, fontWeight: 'var(--label-weight)', letterSpacing: 'var(--label-track)', textTransform: 'var(--label-case)',
              color: palette.accent, marginBottom: 52
            }}>
              Album #{data.albumNumber}
            </div>
          </Removable>
        )}
        <Cover src={album.coverProxied} size={640}
          style={{ borderRadius: 36, boxShadow: '0 50px 120px rgba(0,0,0,0.65)' }} />
        <FitText
          size={66} min={44} lines={2} weight={800} fitKey={album.name}
          style={{ letterSpacing: -1.5, marginTop: 22, width: 880, textAlign: 'center' }}
        >
          <Editable field="albumName" value={album.name} onEdit={onEdit} />
        </FitText>
        {!off('artist') && (
          <Removable id="artist" name="the credit" onRemove={onRemovePart}>
            <FitText
              size={42} min={28} weight={600} fitKey={album.artists.join(', ')}
              style={{ color: 'rgba(var(--ink-rgb), 0.78)', marginTop: 10, width: 880, textAlign: 'center' }}
            >
              <Editable field="artist" value={album.artists.join(', ')} onEdit={onEdit} />
            </FitText>
          </Removable>
        )}
        {!off('meta') && [album.year, album.genre].filter(Boolean).length > 0 && (
          <Removable id="meta" name="the year and genre" onRemove={onRemovePart}>
            <div style={{ fontSize: 32, fontWeight: 600, color: palette.accent, marginTop: 10 }}>
              {album.year
                ? <Editable field="year" value={String(album.year)} onEdit={onEdit} />
                : null}
              {album.year && album.genre ? ' · ' : ''}
              {album.genre || ''}
            </div>
          </Removable>
        )}
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
      <Cover src={album.coverProxied} size={168} style={{ borderRadius: 'var(--cover-radius)', boxShadow: '0 20px 60px rgba(0,0,0,0.55)' }} />
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
        <Cover src={album.coverProxied} size={108} style={{ borderRadius: 20, boxShadow: '0 14px 34px rgba(0,0,0,0.5)' }} />
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

function Superlative ({ label, value, tone, theme, field, onEdit }) {
  return (
    <Surface theme={theme} radius={26} style={{ padding: '18px 24px', flex: 1, minWidth: 0 }}>
      <div style={{ fontSize: 18, fontWeight: 'var(--label-weight)', letterSpacing: 'var(--label-track)', textTransform: 'var(--label-case)', color: tone }}>{label}</div>
      <FitText size={30} min={19} weight={700} fitKey={value} style={{ marginTop: 6 }}>
        <Editable field={field} value={value} onEdit={onEdit} />
      </FitText>
    </Surface>
  )
}

export function CriteriaFrame ({ data, palette, theme, hiddenParts = [], onRemovePart, onEdit }) {
  const off = id => hiddenParts.includes(id)
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

      {((sel.bestSong && !off('bestSong')) || (sel.worstSong && !off('worstSong'))) && (
        <div style={{ display: 'flex', gap: 18, marginTop: 20 }}>
          {sel.bestSong && !off('bestSong') && (
            <Removable id="bestSong" name="Best Song" onRemove={onRemovePart}
              style={{ flex: 1, minWidth: 0, display: 'flex' }}>
              <Superlative label="Best Song" value={sel.bestSong} tone="#6ee7a0" theme={theme}
                field="selections.bestSong" onEdit={onEdit} />
            </Removable>
          )}
          {sel.worstSong && !off('worstSong') && (
            <Removable id="worstSong" name="Worst Song" onRemove={onRemovePart}
              style={{ flex: 1, minWidth: 0, display: 'flex' }}>
              <Superlative label="Worst Song" value={sel.worstSong} tone="#f97316" theme={theme}
                field="selections.worstSong" onEdit={onEdit} />
            </Removable>
          )}
        </div>
      )}

      {nowTrack && !off('nowPlaying') && (
        <Removable id="nowPlaying" name="Now Playing" onRemove={onRemovePart} style={{ marginTop: 20 }}>
          <NowPlaying track={nowTrack} album={album} palette={palette} theme={theme} />
        </Removable>
      )}

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
      <Cover src={entry.coverProxied} size={112} style={{ borderRadius: 20 }} />
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

export function ComparisonFrame ({ data, palette, theme, hiddenParts = [], onRemovePart }) {
  const { review, rank, totalRanked, ladder: all } = data
  const artistRefs = useRef([])
  // A row taken off the ladder is a decision about this review's slides, so it
  // is keyed the same way as any other removed block. The album itself is
  // untouched: it keeps its place in the library and its rank.
  const ladder = all.filter(e => e.gap || !hiddenParts.includes(`rank:${e.albumId}`))
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
          <Removable
            key={entry.albumId}
            id={`rank:${entry.albumId}`}
            name={entry.album.name}
            onRemove={entry.albumId === review.albumId ? undefined : onRemovePart}
          >
            <RankRow
              entry={entry} palette={palette} theme={theme}
              highlight={entry.albumId === review.albumId}
              artistRef={el => { artistRefs.current[slot.get(entry.albumId)] = el }}
              artistSize={artistSize}
            />
          </Removable>
        ))}
      </Fill>
    </FrameShell>
  )
}

// ---------- Frame 5+: one artist's discography ----------
const CELL = Math.floor((CONTENT_W - 2 * 26) / 3) // 3 across the safe width

function DiscoCell ({ album, isCurrent, palette, theme, onRemove }) {
  const rated = album.rated && typeof album.rating === 'number'
  return (
    <Removable id={album.key} name={album.name} onRemove={onRemove} inline>
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
    </Removable>
  )
}

export function DiscographyFrame ({ group, page, pages, currentAlbumName, palette, theme, counts, onRemoveAlbum }) {
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
          {group.albums.filter(a => !a.hidden).map(a => (
            <DiscoCell
              key={a.key} album={a} palette={palette} theme={theme}
              isCurrent={a.name === currentAlbumName}
              onRemove={onRemoveAlbum}
            />
          ))}
        </div>
      </Fill>
    </FrameShell>
  )
}
