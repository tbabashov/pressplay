// Account tiers: what an account is allowed to do, and what it costs.
//
// Not to be confused with the tiers in scales.js, which are the names a score
// is given on a rating scale. Those describe an album; these describe an
// account. Everything here is named accountTier or TIER_* to keep the two
// apart in a search.
//
// Prices are pitched at the audience this actually has: a music account with
// a four figure following, where the realistic outcome is a lot of small
// payments rather than a few large ones. Plus is an impulse price someone
// decides on once and stops thinking about; Studio is for the handful who post
// constantly and would notice a daily limit within a week. The yearly price is
// ten months, so a year is the obvious choice for anyone who stays.
//
// Checkout is not connected yet. Nothing here talks to a payment provider: it
// decides what an account may do, and the upgrade button says as much.

export const TIERS = ['free', 'plus', 'studio']

export const TIER_DETAIL = {
  free: {
    key: 'free',
    name: 'Free',
    blurb: 'Rate a few albums a day and post the slides.',
    monthly: 0,
    yearly: 0,
    limits: {
      albumsPerDay: 3,
      cutouts: 1,
      styles: 3,
      customCriteria: false,
      customScales: false,
      discographySlides: false,
      downloadAll: false,
      mark: true          // the Press Play mark stays on the slides
    },
    perks: [
      'Three albums a day',
      'The eleven point scale and the built in criteria',
      'One artist cut-out',
      'Three slide styles',
      'Publish, and be on the social page'
    ]
  },
  plus: {
    key: 'plus',
    name: 'Plus',
    blurb: 'For anyone posting a few times a week.',
    monthly: 3,
    yearly: 30,
    limits: {
      albumsPerDay: 20,
      cutouts: 3,
      styles: Infinity,
      customCriteria: true,
      customScales: true,
      discographySlides: true,
      downloadAll: true,
      mark: false
    },
    perks: [
      'Twenty albums a day',
      'Your own criteria and your own rating scales',
      'Three artist cut-outs',
      'Every slide style',
      'Discography and leaderboard slides',
      'No mark on the slides'
    ]
  },
  studio: {
    key: 'studio',
    name: 'Studio',
    blurb: 'For accounts that post every day.',
    monthly: 8,
    yearly: 80,
    limits: {
      albumsPerDay: Infinity,
      cutouts: 3,
      styles: Infinity,
      customCriteria: true,
      customScales: true,
      discographySlides: true,
      downloadAll: true,
      mark: false
    },
    perks: [
      'Everything in Plus',
      'No daily limit at all',
      'Your handle on the slides in place of the mark',
      'New slide styles before anyone else'
    ]
  }
}

export const TIER_LIST = TIERS.map(k => TIER_DETAIL[k])

// The owner runs the place, so the owner is on the top tier. Everyone else is
// on whatever their profile says, and an unknown value reads as free rather
// than throwing: a bad tier should cost someone a feature, never a page.
export function accountTier (session, profile) {
  if (session?.user?.role === 'owner') return 'studio'
  const t = profile?.tier
  return TIERS.includes(t) ? t : 'free'
}

export const limitsFor = tier => TIER_DETAIL[TIERS.includes(tier) ? tier : 'free'].limits

// What to say when something is not included. One sentence, naming the lowest
// tier that has it, so nobody has to read the table to find out.
export function needsTier (feature) {
  const tier = TIERS.find(t => {
    const v = TIER_DETAIL[t].limits[feature]
    return v === true || v === Infinity
  })
  return tier ? TIER_DETAIL[tier].name : null
}
