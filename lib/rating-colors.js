// Rating color scale, reused on the rating page and in every export image.
// 0 brown, 1 red-brown, 2 dark red, 3 bright red, 4 orange, 5 yellow,
// 6 light green, 7 dark green, 8 blue, 9 purple, 10 perfect gradient blue,
// 11 majestic pink gradient. 'skit' = N/A grey (excluded from every average).
export { NA } from './rating-scale.js'
import { NA } from './rating-scale.js'
import { tierFor, rampColour, readableOn } from './scales.js'
export const SKIT = NA // legacy alias, the stored value is still 'skit'

// A scale the rater built gets its own colours; the house ladder keeps the
// exact ones the exported frames were signed off with, gradients and halo
// included, because those cannot be expressed as a single hex and are not the
// product's to change. Passing no scale means the house ladder, so the fourteen
// places that already call this keep working untouched.
export function ratingColor (score, scale) {
  if (scale && !scale.signature) {
    if (score === null || score === undefined) return { bg: 'rgba(120,120,128,0.24)', fg: '#a1a1a6' }
    if (score === NA) return { bg: 'rgba(142,142,147,0.5)', fg: '#e8e8ed' }
    const tier = tierFor(score, scale)
    const hex = tier?.colour || rampColour(Number(score) || 0, scale.max || 11)
    return { bg: hex, fg: readableOn(hex) }
  }
  return signatureColor(score)
}

function signatureColor (score) {
  if (score === null || score === undefined) return { bg: 'rgba(120,120,128,0.24)', fg: '#a1a1a6' }
  if (score === NA) return { bg: 'rgba(142,142,147,0.5)', fg: '#e8e8ed' }
  if (score >= 11) return { bg: 'linear-gradient(135deg, #fbcfe8 0%, #f472b6 42%, #db2777 78%, #f9a8d4 100%)', fg: '#fff', glow: 'rgba(244,114,182,0.6)' }
  if (score >= 10) return { bg: 'linear-gradient(135deg, #7dd3fc 0%, #2563eb 55%, #38bdf8 100%)', fg: '#fff', glow: 'rgba(56,189,248,0.55)' }
  if (score >= 9) return { bg: '#8b5cf6', fg: '#fff' }
  if (score >= 8) return { bg: '#1d4ed8', fg: '#fff' }
  if (score >= 7) return { bg: '#15803d', fg: '#fff' }
  if (score >= 6) return { bg: '#6ee7a0', fg: '#052e12' }
  if (score >= 5) return { bg: '#facc15', fg: '#422006' }
  if (score >= 4) return { bg: '#f97316', fg: '#431407' }
  if (score >= 3) return { bg: '#ef4444', fg: '#fff' }
  if (score >= 2) return { bg: '#991b1b', fg: '#fecaca' }
  if (score >= 1) return { bg: '#7c3f1d', fg: '#fed7aa' }
  return { bg: '#5c3a21', fg: '#e7cba9' }
}

// What a chip prints for a given stored value: N/A is a dash, everything else
// is the number (one decimal when it's an album-level score).
export function scoreText (score, decimals = 0) {
  if (score === NA) return '–'
  if (score === null || score === undefined) return '—'
  return decimals ? Number(score).toFixed(decimals) : String(score)
}

export const SCALE_ROWS = [11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0]

const sat = c => {
  const mx = Math.max(c.r, c.g, c.b), mn = Math.min(c.r, c.g, c.b)
  return mx === 0 ? 0 : (mx - mn) / mx
}
const lum = c => (0.299 * c.r + 0.587 * c.g + 0.114 * c.b) / 255

const rgbToHue = c => {
  const r = c.r / 255, g = c.g / 255, b = c.b / 255
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn
  if (d === 0) return 0
  let h
  if (mx === r) h = ((g - b) / d) % 6
  else if (mx === g) h = (b - r) / d + 2
  else h = (r - g) / d + 4
  return (h * 60 + 360) % 360
}

// Build a full frame palette from one base color (auto-picked or user-chosen).
// #rgb or #rrggbb into the {r, g, b} everything below works in.
function hexToRgb (hex) {
  const h = String(hex).trim().replace(/^#/, '')
  const full = h.length === 3 ? h.split('').map(x => x + x).join('') : h
  if (!/^[0-9a-f]{6}$/i.test(full)) return null
  const n = parseInt(full, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

// Takes either the {r, g, b} the cover reader produces or the hex string a
// swatch is written as. It used to take only the object, and both accent
// pickers hand it a string: every channel then read as undefined, so every
// swatch produced the same near-black palette and picking a different colour
// visibly changed nothing but the fact that it was wrong.
export function paletteFromColor (input) {
  const c = typeof input === 'string' ? hexToRgb(input) : input
  if (!c || !Number.isFinite(c.r) || !Number.isFinite(c.g) || !Number.isFinite(c.b)) return null
  return paletteFromRgb(c)
}

function paletteFromRgb (c) {
  const isColorful = sat(c) > 0.15
  const hue = rgbToHue(c)
  const s = isColorful ? Math.max(45, Math.min(75, sat(c) * 100)) : 6
  // Neutral-bright base (white pick) gets a silver look with lifted lightness
  const isWhite = !isColorful && lum(c) > 0.6
  const l1 = isWhite ? 26 : 20
  const l2 = isWhite ? 11 : 8
  let acc = { ...c }
  while (lum(acc) < 0.5) {
    acc = { r: Math.min(255, acc.r * 1.25 + 12), g: Math.min(255, acc.g * 1.25 + 12), b: Math.min(255, acc.b * 1.25 + 12) }
  }
  return {
    // hue/sat are kept raw so the gradient theme can derive analogous tones
    hue: hue | 0,
    sat: s | 0,
    dominant: `hsl(${hue | 0}, ${s | 0}%, ${isWhite ? 45 : 34}%)`,
    accent: isWhite ? 'rgb(240,240,245)' : `rgb(${acc.r | 0}, ${acc.g | 0}, ${acc.b | 0})`,
    // same hue, pre-mixed with alpha, for halos around a highlighted element
    accentGlow: isWhite
      ? 'rgba(240,240,245,0.4)'
      : `rgba(${acc.r | 0}, ${acc.g | 0}, ${acc.b | 0}, 0.4)`,
    bgTop: `hsl(${hue | 0}, ${s | 0}%, ${l1}%)`,
    bgBottom: `hsl(${hue | 0}, ${s | 0}%, ${l2}%)`,
    card: 'rgba(255,255,255,0.08)'
  }
}

// Extract a dominant palette from an image (drawn small on a canvas).
// The returned palette carries `.swatches`: candidate base colors from the
// cover (top hue families + neutrals) for manual palette selection.
export function extractPalette (imgUrl) {
  return new Promise(resolve => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const size = 64
        const canvas = document.createElement('canvas')
        canvas.width = size
        canvas.height = size
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, size, size)
        const { data } = ctx.getImageData(0, 0, size, size)
        const buckets = new Map()
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2]
          const key = `${r >> 4},${g >> 4},${b >> 4}`
          const e = buckets.get(key) || { r: 0, g: 0, b: 0, n: 0 }
          e.r += r; e.g += g; e.b += b; e.n++
          buckets.set(key, e)
        }
        const sorted = [...buckets.values()]
          .map(e => ({ r: e.r / e.n, g: e.g / e.n, b: e.b / e.n, n: e.n }))
          .sort((a, b) => b.n - a.n)

        const avg = e => ({ r: e.r / (e.w || 1), g: e.g / (e.w || 1), b: e.b / (e.w || 1) })

        // Which hue family carries the most total color across the cover?
        // Weighting whole hue bins by coverage × saturation stops a small
        // saturated patch from outvoting the cover's overall tone.
        const BINS = 24
        const binW = new Array(BINS).fill(0)
        const binC = Array.from({ length: BINS }, () => ({ r: 0, g: 0, b: 0, w: 0 }))
        let colorWeight = 0, totalWeight = 0
        const white = { r: 0, g: 0, b: 0, w: 0 }
        const dark = { r: 0, g: 0, b: 0, w: 0 }
        for (const c of sorted) {
          totalWeight += c.n
          const s0 = sat(c), l0 = lum(c)
          if (s0 < 0.15 || l0 < 0.06 || l0 > 0.96) {
            // track neutrals for the swatch options
            const t = l0 >= 0.5 ? white : dark
            t.r += c.r * c.n; t.g += c.g * c.n; t.b += c.b * c.n; t.w += c.n
            continue
          }
          const w = c.n * s0
          const bin = Math.floor(rgbToHue(c) / (360 / BINS)) % BINS
          binW[bin] += w
          const e = binC[bin]
          e.r += c.r * w; e.g += c.g * w; e.b += c.b * w; e.w += w
          colorWeight += w
        }
        // Smooth over neighboring bins so a hue straddling a bin edge still wins
        let best = 0, bestScore = -1
        for (let i = 0; i < BINS; i++) {
          const score = binW[(i + BINS - 1) % BINS] * 0.35 + binW[i] + binW[(i + 1) % BINS] * 0.35
          if (score > bestScore) { bestScore = score; best = i }
        }
        const e = binC[best]
        const colorful = e.w > 0
          ? { r: e.r / e.w, g: e.g / e.w, b: e.b / e.w }
          : sorted[0]

        // Grayscale cover if colorful pixels are a trivial share of the image
        const isColorful = e.w > 0 && colorWeight / totalWeight > 0.04
        const base = isColorful ? colorful : (white.w >= dark.w ? avg(white) : avg(dark))

        // Swatch candidates: the top hue families plus the cover's neutrals
        const swatches = []
        const binRank = binW.map((w, i) => ({ w, i })).filter(x => x.w > colorWeight * 0.06)
          .sort((a, b) => b.w - a.w).slice(0, 4)
        for (const { i } of binRank) swatches.push(avg(binC[i]))
        if (white.w > totalWeight * 0.03) swatches.push(avg(white))
        if (dark.w > totalWeight * 0.03) swatches.push(avg(dark))

        const palette = paletteFromColor(base)
        palette.swatches = swatches
        resolve(palette)
      } catch {
        resolve(fallbackPalette())
      }
    }
    img.onerror = () => resolve(fallbackPalette())
    img.src = imgUrl
  })
}

export function fallbackPalette () {
  return {
    hue: 240,
    sat: 6,
    dominant: 'rgb(40,40,46)',
    accent: 'rgb(190,190,200)',
    accentGlow: 'rgba(190,190,200,0.4)',
    bgTop: 'rgb(24,24,28)',
    bgBottom: 'rgb(10,10,12)',
    card: 'rgba(255,255,255,0.08)',
    swatches: []
  }
}

export function fmtDuration (ms) {
  const s = Math.round(ms / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export function fmtRuntime (ms) {
  const min = Math.round(ms / 60000)
  const h = Math.floor(min / 60)
  return h > 0 ? `${h} hr ${min % 60} min` : `${min} min`
}
