// Moves the local JSON store into Postgres, once.
//
//   DATABASE_URL='postgres://…' node scripts/import-to-postgres.mjs           (dry run)
//   DATABASE_URL='postgres://…' node scripts/import-to-postgres.mjs --write   (for real)
//
// Safe to run twice: every write is an upsert keyed the same way the app keys
// them, so a second run updates rather than duplicating. It never deletes.
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const WRITE = process.argv.includes('--write')

if (!process.env.DATABASE_URL) {
  console.error('Set DATABASE_URL first. Nothing was read or written.')
  process.exit(1)
}

const store = JSON.parse(await fs.readFile(path.join(ROOT, '.data/reviews.json'), 'utf8'))

const reviews = [], discography = [], profiles = [], snapshots = [], prefs = [], comments = [], follows = []
for (const [key, v] of Object.entries(store)) {
  if (!v) continue
  if (key.startsWith('user::')) profiles.push(v)
  else if (key.startsWith('disc::')) discography.push(v)
  else if (key.startsWith('snapshot::')) snapshots.push(v)
  else if (key.startsWith('prefs::')) prefs.push(v)
  else if (key.startsWith('comment::')) comments.push(v)
  else if (key.startsWith('follow::')) follows.push(v)
  else if (key.startsWith('cred::')) { /* passwords stay put; re-set them rather than copying hashes */ }
  else if (v.albumId) reviews.push(v)
}

console.log('found in the local store')
console.log('  reviews      ', reviews.length)
console.log('  discography  ', discography.length)
console.log('  profiles     ', profiles.length)
console.log('  snapshots    ', snapshots.length)
console.log('  preferences  ', prefs.length)
console.log('  comments     ', comments.length)
console.log('  follows      ', follows.length)

// A cover that is still a data URL would be copied into Postgres as one. They
// were written out to public/ during the migration, so this should be zero; if
// it is not, fix that before importing rather than carrying it into the database.
const inlined = reviews.filter(r => String(r.cover || '').startsWith('data:')).length
if (inlined) console.log(`\n  warning: ${inlined} reviews still carry an inline base64 cover`)

if (!WRITE) {
  console.log('\nDry run. Nothing was written. Add --write to import.')
  process.exit(0)
}

const db = await import(path.join(ROOT, 'lib/db/postgres.js'))
await db.init()
console.log('\nschema ready, importing')

let n = 0
for (const p of profiles) { await db.upsertProfile(p.email, p); n++ }
console.log('  profiles     ', n); n = 0
for (const r of reviews) { await db.saveReview(r); n++ }
console.log('  reviews      ', n); n = 0
for (const d of discography) { await db.saveDiscographyEntry(d.userEmail, d); n++ }
console.log('  discography  ', n); n = 0
for (const s of snapshots) { await db.saveSnapshot(s.email, s.ranks, s.ratings); n++ }
console.log('  snapshots    ', n); n = 0
for (const p of prefs) { await db.savePreferences(p.email, p.value); n++ }
console.log('  preferences  ', n); n = 0
for (const c of comments) { await db.addComment(c); n++ }
console.log('  comments     ', n); n = 0
for (const f of follows) { await db.follow(f.follower, f.target); n++ }
console.log('  follows      ', n)

// Read it back rather than trusting the writes.
const back = await db.listReviews(reviews[0]?.userEmail)
const top = back.filter(r => typeof r.final === 'number').sort((a, b) => b.final - a.final)[0]
console.log(`\nread back from Postgres: ${back.length} reviews`)
if (top) console.log(`number one: ${top.final.toFixed(2)} ${top.albumName} by ${top.artist}`)
console.log('\nDone. Your local .data/reviews.json is untouched.')
process.exit(0)
