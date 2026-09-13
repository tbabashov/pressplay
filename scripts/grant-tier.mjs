// Put an account on a tier by hand.
//
// For the case the webhook exists to prevent and occasionally fails to: somebody
// has paid, Lemon Squeezy has the money, and the account is still on free. This
// writes the same row the webhook would have written, through the same function,
// so a later renewal or cancellation lands on a record that already looks right.
//
//   DATABASE_URL='postgresql://...' node scripts/grant-tier.mjs \
//     --email someone@example.com --tier plus \
//     [--subscription 123456] [--status active] [--variant 987654] [--renews 2026-10-13]
//
// Add --confirm to actually write. Without it this prints what it would do and
// changes nothing, because the whole point of a manual grant is that it is being
// done outside the system that normally checks itself.

import fs from 'node:fs'
import { TIERS } from '../lib/tiers.js'

// Next loads .env.local for the app; a plain node script does not, so it is
// read here. It means the connection string can sit in the file that is already
// gitignored instead of being typed onto a command line, where it would land in
// the shell history of whoever ran it.
for (const file of ['.env.local', '.env']) {
  if (!fs.existsSync(file)) continue
  for (const line of fs.readFileSync(file, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#') || !t.includes('=')) continue
    const i = t.indexOf('=')
    const k = t.slice(0, i).trim()
    let v = t.slice(i + 1).trim().replace(/^["']|["']$/g, '')
    if (k && !process.env[k]) process.env[k] = v
  }
}

// Imported after the env is in place: the store picks its backing at import.
const { getProfile, setSubscription } = await import('../lib/db/index.js')

const arg = name => {
  const i = process.argv.indexOf(`--${name}`)
  return i > -1 ? process.argv[i + 1] : null
}
const has = name => process.argv.includes(`--${name}`)

const email = (arg('email') || '').trim().toLowerCase()
const tier = (arg('tier') || '').trim().toLowerCase()

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. This talks to the real database, so it')
  console.error('has to be given the real connection string:\n')
  console.error("  DATABASE_URL='postgresql://...' node scripts/grant-tier.mjs --email you@example.com --tier plus\n")
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
