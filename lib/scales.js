// The scale is the instrument, and PRODUCT.md is explicit that it belongs to
// the rater: the owner's 0 to 11 ladder with an 11 named Majestic is one preset
// among several, not the product's rule. The 11 is an option, never an
// assumption.
//
// A scale is an ordered list of tiers, each with a value, a name and a colour,
// plus whether a value may be marked N/A so interludes stay out of the average.

export const NA = 'skit'   // the stored value, unchanged since the first version

// The house ladder. Its colours are the ones the exported frames were signed
// off with, so they are named rather than given as hex: the pink eleven and the
// blue ten are gradients with a halo and cannot be expressed as one colour.
export const SIGNATURE_TIERS = [
  { value: 11, name: 'Majestic' }, { value: 10, name: 'Perfect' },
  { value: 9, name: 'Peak' }, { value: 8, name: 'Great' },
  { value: 7, name: 'Good' }, { value: 6, name: 'Decent' },
  { value: 5, name: 'Mid' }, { value: 4, name: 'Meh' },
  { value: 3, name: 'Bad' }, { value: 2, name: 'Awful' },
  { value: 1, name: 'Terrible' }, { value: 0, name: 'Trash' }
]

// Flat colours for scales that do not inherit the house ladder. Warm at the
// bottom, cool through the middle, saturated at the top, so a scale of any
// length still reads as a ladder rather than a set of unrelated swatches.
const RAMP = [
  '#5c3a21', '#7c3f1d', '#991b1b', '#ef4444', '#f97316', '#facc15',
  '#6ee7a0', '#15803d', '#1d4ed8', '#8b5cf6', '#2563eb', '#db2777'
]

export const rampColour = (value, max) => {
  if (max <= 0) return RAMP[0]
  const i = Math.round((value / max) * (RAMP.length - 1))
  return RAMP[Math.min(RAMP.length - 1, Math.max(0, i))]
}

const tiersFor = (max, names = {}) =>
  Array.from({ length: max + 1 }, (_, n) => max - n).map(value => ({
    value,
    name: names[value] || '',
    colour: rampColour(value, max)
  }))

export const SCALE_PRESETS = [
  {
    id: 'eleven',
    name: 'Eleven point',
    note: 'The house ladder, with an 11 named Majestic.',
    max: 11, na: true, signature: true,
    tiers: SIGNATURE_TIERS.map(t => ({ ...t, colour: null }))
  },
  {
    id: 'ten',
    name: 'Ten point',
    note: 'Zero to ten, no ceiling above perfect.',
    max: 10, na: true,
    tiers: tiersFor(10, {
      10: 'Perfect', 9: 'Excellent', 8: 'Great', 7: 'Good', 6: 'Decent',
      5: 'Mid', 4: 'Weak', 3: 'Bad', 2: 'Awful', 1: 'Terrible', 0: 'Unlistenable'
    })
  },
  {
    id: 'five',
    name: 'Five star',
    note: 'What most places use. Half stars are typed as decimals.',
    max: 5, na: true,
    tiers: tiersFor(5, {
      5: 'Essential', 4: 'Strong', 3: 'Fine', 2: 'Poor', 1: 'Bad', 0: 'Worthless'
    })
  },
  {
    id: 'hundred',
    name: 'Hundred point',
    note: 'For anyone who wants the room to split hairs.',
    max: 100, na: true,
    tiers: [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 0].map(value => ({
      value, name: '', colour: rampColour(value, 100)
    }))
  }
]

export const DEFAULT_SCALE = SCALE_PRESETS[0]
export const SCALE_MAX_CEILING = 100
export const TIER_NAME_MAX = 18

// Stored scales can come from an older version or be edited by hand, so a scale
// is validated on the way out rather than trusted. A broken one would make every
// score on every screen unreadable at once.
export function normaliseScale (scale) {
  if (!scale || typeof scale !== 'object') return DEFAULT_SCALE
  const max = Math.round(Number(scale.max))
  if (!Number.isFinite(max) || max < 1 || max > SCALE_MAX_CEILING) return DEFAULT_SCALE

  const seen = new Set()
  const tiers = (Array.isArray(scale.tiers) ? scale.tiers : [])
    .map(t => ({
      value: Math.round(Number(t?.value)),
      name: String(t?.name ?? '').replace(/\s+/g, ' ').trim().slice(0, TIER_NAME_MAX),
      colour: typeof t?.colour === 'string' && /^#[0-9a-f]{6}$/i.test(t.colour) ? t.colour : null
    }))
    .filter(t => {
      if (!Number.isFinite(t.value) || t.value < 0 || t.value > max || seen.has(t.value)) return false
      seen.add(t.value)
      return true
    })
    .sort((a, b) => b.value - a.value)

  return {
    id: typeof scale.id === 'string' ? scale.id.slice(0, 24) : 'custom',
    name: String(scale.name || 'Custom').slice(0, 32),
    max,
    na: scale.na !== false,
    signature: !!scale.signature,
    tiers: tiers.length ? tiers : tiersFor(max)
  }
}

// What a given score is called on this scale. Falls to the nearest tier at or
// below the score, so a hundred point scale with tiers every ten still names
// everything in between.
export function tierFor (score, scale = DEFAULT_SCALE) {
  if (score === NA || score === null || score === undefined) return null
  const n = Number(score)
  if (!Number.isFinite(n)) return null
  return scale.tiers.find(t => t.value <= n) || scale.tiers[scale.tiers.length - 1] || null
}

export const tierName = (score, scale) => tierFor(score, scale)?.name || ''
export const fmtScore = v => (typeof v === 'number' ? v.toFixed(1) : '—')

// Text that stays readable on a colour the rater chose. Perceived brightness,
// not an average of the channels: the eye reads green far more strongly than
// blue, so a mid green and a mid blue need different ink.
export function readableOn (hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex || ''))
  if (!m) return '#ffffff'
  const [r, g, b] = [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16) / 255)
  const lin = v => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)
  const l = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b)
  return l > 0.45 ? '#12121a' : '#ffffff'
}
