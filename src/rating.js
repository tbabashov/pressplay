// Shared rating math — imported by both the Express server and the React app,
// so the order the API ranks albums in and the numbers the export frames print
// can never drift apart. Keep this file free of JSX and browser APIs.

// Stored as the string 'skit' because that's the key the first 140 reviews were
// written with. It is shown everywhere as "N/A" (a dash on the chip) and is
// skipped by every average.
export const NA = 'skit'

export const MIN_SCORE = 0
export const MAX_SCORE = 11

// The five numbers typed by hand on the Rate page, in display order. The song
// average joins them as a sixth, equal-weight input.
export const CRITERIA = [
  ['lyricism', 'Lyricism'],
  ['production', 'Production'],
  ['delivery', 'Delivery'],
  ['albumExperience', 'Album Experience'],
  ['replayValue', 'Replay Value']
]

// Slots 3 and 4 used to be Accessibility and Consistency. Reviews written under
// the old names keep their numbers under the new keys — see the migration in
// server/store.js.
export const RENAMED_CRITERIA = {
  accessibility: 'delivery',
  consistency: 'albumExperience'
}

// Mean of every numeric track rating; N/A tracks don't vote.
export function songAverage (review) {
  const vals = Object.values(review?.ratings || {}).filter(v => typeof v === 'number')
  if (!vals.length) return null
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

// The six inputs to the final rating, in the order the criteria frame shows them.
export function ratingParts (review) {
  const c = review?.criteria || {}
  return [
    { key: 'songAverage', label: 'Song Average', value: songAverage(review), auto: true },
    ...CRITERIA.map(([key, label]) => ({
      key,
      label,
      value: typeof c[key] === 'number' ? c[key] : null,
      auto: false
    }))
  ]
}

// Song average and the five criteria weighted equally. Criteria left blank
// simply don't vote, which is what keeps the pre-criteria back catalogue ranked
// on its song average alone until each album is re-rated. A typed
// `finalOverride` wins outright.
export function finalRating (review) {
  if (typeof review?.finalOverride === 'number') return review.finalOverride
  const vals = ratingParts(review).map(p => p.value).filter(v => typeof v === 'number')
  if (!vals.length) return null
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

// True once at least one track carries a real score — an album with nothing but
// N/A tracks has no average and stays off the leaderboard.
export const isRated = r => Object.values(r?.ratings || {}).some(v => typeof v === 'number')

// One decimal everywhere, so "9" and "9.0" never appear side by side.
export const fmtScore = v => typeof v === 'number' ? v.toFixed(1) : '—'

// Accepts "9", "9.4", "11" — anything outside 0–11 is rejected so a typo can't
// silently outrank a real album.
export function parseScore (text) {
  const v = Number(String(text).trim())
  if (!String(text).trim() || Number.isNaN(v)) return null
  if (v < MIN_SCORE || v > MAX_SCORE) return null
  return Math.round(v * 10) / 10
}
