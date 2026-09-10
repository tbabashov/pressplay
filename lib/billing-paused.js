// Subscriptions, switched off by hand.
//
// One switch, in one file, because the button and the route it posts to have to
// agree about this. A disabled button is a suggestion — anything can post to
// the route — so the route refuses too, and both read this.
//
// TO PUT SUBSCRIPTIONS BACK: set PAUSED to false. That is the whole change.
// Nothing else needs touching, and nothing about the tiers themselves has been
// altered: limits, entitlements and what each tier allows are all untouched, so
// accounts already on a paid tier keep everything they have.
//
// Its own file rather than a flag inside billing.js, which imports node:crypto
// and so cannot be pulled into a client component.
export const BILLING_PAUSED = true

// Said the same way wherever it is said.
export const PAUSED_LABEL = 'Under maintenance'
export const PAUSED_NOTE =
  'Subscriptions are paused for maintenance. Nothing is being charged, and every ' +
  'account keeps exactly what it already has.'
