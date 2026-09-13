// Put an account on a tier by hand.
//
// For the case the webhook exists to prevent and occasionally fails to: somebody
// has paid, Lemon Squeezy has the money, and the account is still on free. This
// writes the same row the webhook would have written, through the same function,
// so a later renewal or cancellation lands on a record that already looks right.
//
//   node scripts/grant-tier.mjs --email someone@example.com --tier plus \
//     [--subscription 123456] [--status active] [--variant 987654] [--renews 2026-10-13]
//
// Add --confirm to actually write. Without it this prints what it would do and
// changes nothing, because the whole point of a manual grant is that it is being
// done outside the system that normally checks itself.

import { loadEnv } from './env.mjs'

loadEnv()

// Imported after the env is in place: the store picks its backing at import.
const { getProfile, setSubscription } = await import('../lib/db/index.js')
const { TIERS } = await import('../lib/tiers.js')

const arg = name => {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? process.argv[i + 1] : null
}
const has = name => process.argv.includes(`--${name}`)

const email = (arg('email') || '').trim().toLowerCase()
const tier = (arg('tier') || '').trim().toLowerCase()

if (!process.env.DATABASE_URL) {
  console.error('No DATABASE_URL, in the environment or in .env.local.')
  console.error('This talks to the real database, so it needs the real connection string.\n')
  process.exit(1)
}
if (!email || !TIERS.includes(tier)) {
  console.error(`Need --email and --tier (one of: ${TIERS.join(', ')}).`)
  process.exit(1)
}

const before = await getProfile(email)
if (!before) {
  // Refused rather than created. An address with no account is far more likely
  // to be a typo, or the address they typed at the till rather than the one
  // they signed in with, than a person who needs a row invented for them.
  console.error(`No account for ${email}. Nothing written.`)
  console.error('Check the address they signed in with, which need not be the one on the receipt.')
  process.exit(1)
}

const update = {
  tier,
  subscriptionId: arg('subscription') || before.subscriptionId || null,
  subscriptionStatus: arg('status') || 'active',
  subscriptionVariant: arg('variant') || before.subscriptionVariant || null,
  renewsAt: arg('renews') || before.subscriptionRenewsAt || null,
  endsAt: null
}

console.log(`account        ${email}`)
console.log(`tier           ${before.tier || 'free'}  ->  ${update.tier}`)
console.log(`subscription   ${update.subscriptionId || '(none)'}`)
console.log(`status         ${update.subscriptionStatus}`)

if (!has('confirm')) {
  console.log('\nDry run. Nothing was written. Add --confirm to apply.')
  process.exit(0)
}

const after = await setSubscription(email, update)
if (!after) {
  console.error('\nThe update matched no row. Nothing changed.')
  process.exit(1)
}
console.log(`\nWritten. ${email} is now on ${after.tier}.`)
process.exit(0)
