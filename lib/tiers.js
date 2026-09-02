// Account tiers: what an account is allowed to do, and what it costs.
//
// Not to be confused with the tiers in scales.js, which are the names a score
// is given on a rating scale. Those describe an album; these describe an
// account. Everything here is named accountTier or TIER_* to keep the two
// apart in a search.
//
// A generation is one album you produced slides for today, not one PNG. An
// album makes six or more images, so counting images would mean the free tier
// could not finish a single record, and counting download presses would punish
// anyone who re-downloaded one slide after fixing a typo. Counting albums is
// also what a poster actually means by "two a day": two posts.
//
// Checkout is not connected. Nothing here talks to a payment provider: it
// decides what an account may do, and the upgrade screen says as much.

export const TIERS = ['free', 'plus', 'max']

// Styles anyone can use. The other two are what the paid tiers are largely for.
export const FREE_STYLES = ['paper', 'marquee', 'mono']

export const TIER_DETAIL = {
  free: {
    key: 'free',
    name: 'Free',
    blurb: 'Rate, publish, argue. Two records a day on the slides.',
    monthly: 0,
    yearly: 0,
    limits: {
      generationsPerDay: 2,
      styles: FREE_STYLES,
      watermark: true,          // the Press Play mark stays on
      cutouts: 1,
      superlatives: 3,
      customCriteria: false,
      customScales: false,
      customAccent: false,
      discographySlides: false,
      downloadAll: false,
      exportScale: 1,
      presets: 0,
      badge: null
    },
    perks: [
      'Two records a day on the slides',
      'Paper, Marquee and Mono styles',
      'Everything social, with no limits at all',
      'One artist cut-out',
      'The eleven point scale and the built in criteria',
      'The Press Play mark stays on the slides'
    ]
  },
  plus: {
    key: 'plus',
    name: 'Plus',
    blurb: 'For anyone posting a few times a week.',
    monthly: 3.99,
    yearly: 43.99,
    limits: {
      generationsPerDay: 10,
      styles: [...FREE_STYLES, 'aurora'],
      watermark: false,
      cutouts: 3,
      superlatives: 8,
      customCriteria: true,
      customScales: true,
      customAccent: true,
      discographySlides: true,
      downloadAll: true,
      exportScale: 1,
      presets: 3,
      badge: 'plus'
    },
    perks: [
      'Ten records a day',
      'The Aurora style',
      'No mark on your slides',
      'Your own criteria and your own rating scales',
      'Three artist cut-outs, and every superlative',
      'Discography and leaderboard slides',
      'Any accent colour, and every slide at once',
      'Three saved looks you can apply to any record',
      'A Plus badge on your ratings'
    ]
  },
  max: {
    key: 'max',
    name: 'Max',
    blurb: 'For accounts that post every day.',
    monthly: 9.99,
    yearly: 109.99,
    limits: {
      generationsPerDay: Infinity,
      styles: null,             // null means every style there is
      watermark: false,
      cutouts: 3,
      superlatives: 8,
      customCriteria: true,
      customScales: true,
      customAccent: true,
      discographySlides: true,
      downloadAll: true,
      exportScale: 2,           // 2160x3840 instead of 1080x1920
      presets: 20,
      badge: 'max'
    },
    perks: [
      'Everything in Plus',
      'No daily limit at all',
      'The Press Play style',
      'Slides at double resolution',
      'Twenty saved looks',
      'Your handle on the slides in place of the mark',
      'New styles before anyone else',
      'A Max badge on your ratings'
    ]
  }
}

export const TIER_LIST = TIERS.map(k => TIER_DETAIL[k])

// The owner runs the place, so the owner is on the top tier. Everyone else is
// on whatever their profile says, and an unknown value reads as free rather
// than throwing: a bad tier should cost someone a feature, never a page.
export function accountTier (session, profile) {
  if (session?.user?.role === 'owner') return 'max'
  const t = profile?.tier
  return TIERS.includes(t) ? t : 'free'
}

export const limitsFor = tier => TIER_DETAIL[TIERS.includes(tier) ? tier : 'free'].limits

export const canUseStyle = (tier, styleId) => {
  const allowed = limitsFor(tier).styles
  return allowed === null || allowed.includes(styleId)
}

// The lowest tier that includes something, for the one line shown when it is
// not included here. Handles a flag, an unlimited number, and a list.
export function tierWith (feature, value) {
  const t = TIERS.find(k => {
    const v = limitsFor(k)[feature]
    if (Array.isArray(v)) return value === undefined || v.includes(value)
    if (v === null) return true
    if (typeof v === 'number') return v === Infinity || v > 0
    return v === true
  })
  return t ? TIER_DETAIL[t].name : null
}

export const priceLabel = n =>
  (n === 0 ? 'Free' : `$${Number(n).toFixed(2)}`)
