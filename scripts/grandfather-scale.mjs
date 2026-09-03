// Pins every existing account to the eleven point ladder it is already using.
//
// The default for a new account moved from the eleven to the ten. An account
// that had saved a scale already keeps it without any help, because what is
// stored is what is read. An account that never opened the rating model has
// nothing stored and falls through to the default, so on the day the default
// changes its whole library would be reinterpreted against a shorter ladder:
// every eleven ever given becomes a score off the end of the scale.
//
// This writes the eleven in explicitly for exactly those accounts, so the
// change only ever applies to accounts made after it.
//
//   node scripts/grandfather-scale.mjs          # says what it would do
//   node scripts/grandfather-scale.mjs --write  # does it
//
// Reads DATABASE_URL the same way the app does: with it, the Postgres store;
// without it, the local JSON file.

import { listProfiles, getPreferences, savePreferences, driver } from '../lib/db/index.js'
import { normalisePreferences } from '../lib/preferences.js'
import { SCALE_PRESETS, LEGACY_SCALE_ID } from '../lib/scales.js'

const write = process.argv.includes('--write')
const eleven = SCALE_PRESETS.find(s => s.id === LEGACY_SCALE_ID)
if (!eleven) {
  console.error('The eleven point preset is gone, so there is nothing to pin to.')
  process.exit(1)
}

const profiles = await listProfiles()
console.log(`\n  store: ${driver()}   accounts: ${profiles.length}   mode: ${write ? 'WRITE' : 'dry run'}\n`)

let pinned = 0
let already = 0

for (const p of profiles) {
  const stored = await getPreferences(p.email)
  // Only an account with no scale of its own is at risk. One that stored the
  // ten on purpose must not be dragged back to the eleven by this.
  const hasOwn = Boolean(stored && stored.scale && stored.scale.id)

  if (hasOwn) {
    already++
    console.log(`  keep   ${p.email.padEnd(34)} already on ${stored.scale.id}`)
    continue
  }

  pinned++
  console.log(`  pin    ${p.email.padEnd(34)} no stored scale -> ${LEGACY_SCALE_ID}`)
  if (write) {
    const base = normalisePreferences(stored || {})
    await savePreferences(p.email, { ...base, scale: eleven })
  }
}

console.log(`\n  ${pinned} to pin, ${already} already had their own.`)
if (pinned && !write) console.log('  Nothing was written. Re-run with --write to apply.\n')
else console.log('')
