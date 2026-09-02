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

export const fmtScore = v => typeof v === 'number' ? v.toFixed(1) : '-'
