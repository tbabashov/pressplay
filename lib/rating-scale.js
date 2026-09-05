// The scoring model, shared by the app and the marketing surfaces.
// Mirrors src/rating.js in the legacy app; the two must not drift.
export const NA = 'skit'
export const MIN_SCORE = 0
export const MAX_SCORE = 11

export const CRITERIA = [
  ['lyricism', 'Lyricism'],
  ['production', 'Production'],
  ['delivery', 'Delivery'],
  ['albumExperience', 'Album Experience'],
  ['replayValue', 'Replay Value']
]

export const TIERS = [
  [11, 'Majestic'], [10, 'Perfect'], [9, 'Peak'], [8, 'Great'],
  [7, 'Good'], [6, 'Decent'], [5, 'Mid'], [4, 'Meh'],
  [3, 'Bad'], [2, 'Awful'], [1, 'Terrible'], [0, 'Trash']
]

export const fmtScore = v => typeof v === 'number' ? v.toFixed(1) : '—'

// A comma is the decimal point across most of the world, and a phone keypad set
// to one of those locales offers no full stop at all. Number('8,5') is NaN, so
// a score typed that way was not a wrong number — it was no number: the track
// refused the keystroke, and a criterion holding one dropped out of the average
// without a word, which is why the final came out wrong rather than blank.
export const normaliseDecimal = raw => String(raw ?? '').replace(/,/g, '.')
