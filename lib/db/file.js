// Development store. The file is the single source of truth and is re-read on
// every write, because more than one process touches it: the dev server, and
// any script run from a terminal. An in-process cache here means whichever
// process writes last silently overwrites the other's records.
import fs from 'fs/promises'
import path from 'path'

const DIR = path.join(process.cwd(), '.data')
const FILE = path.join(DIR, 'reviews.json')

export async function init () {
  try {
    await fs.mkdir(DIR, { recursive: true })
  } catch (e) {
    // A serverless filesystem is read only. Saying so beats an EROFS stack
    // trace that reaches the browser as an opaque digest.
    if (e.code === 'EROFS' || e.code === 'EACCES') {
      throw new Error(
        'This host has a read-only filesystem, so the JSON store cannot be used. ' +
        'Set DATABASE_URL to a Postgres connection string.'
      )
    }
    throw e
  }
}

// Parsing eight megabytes of JSON on every call is affordable once per request
// and not affordable ten times, which is what a page showing several raters
// costs. The cache is keyed on the file's own mtime and size, so a write from
// another process invalidates it; a write from this one goes through mutate(),
// which never reads through the cache at all.
let cache = null

async function read ({ fresh = false } = {}) {
  await init()

  let stat = null
  try {
    stat = await fs.stat(FILE)
  } catch {
    cache = null
    return {}          // genuinely absent: a fresh install
  }

  const stamp = `${stat.mtimeMs}:${stat.size}`
  if (!fresh && cache && cache.stamp === stamp) return cache.data

  const raw = await fs.readFile(FILE, 'utf8')
  let data
  try {
    data = JSON.parse(raw)
  } catch (e) {
    // Present but unreadable. Refuse to continue rather than overwrite it with
    // an empty object and destroy whatever is still in there.
    throw new Error(`${FILE} is not valid JSON (${e.message}). Move it aside to start fresh.`)
  }
  cache = { stamp, data }
  return data
}

let seq = 0
async function write (data) {
  // Unique per write: two writes sharing a temp path will rename over each
  // other and leave a truncated file behind.
  const tmp = `${FILE}.${process.pid}.${++seq}.${Date.now()}.tmp`
  try {
    await fs.writeFile(tmp, JSON.stringify(data, null, 2))
    await fs.rename(tmp, FILE)
  } catch (e) {
    await fs.rm(tmp, { force: true })
    throw e
  } finally {
    // Whatever happened, what is on disk no longer matches what was cached.
    cache = null
  }
}

// Writes are queued, so a read-modify-write can never interleave with another
// one in this process. Re-reading each time covers the other processes.
let queue = Promise.resolve()
async function mutate (fn) {
  const run = queue.then(async () => {
    // Always off the disk: a read-modify-write built on a cached copy is
    // exactly how one process's records get overwritten by another's.
    const data = await read({ fresh: true })
    const out = fn(data)
    await write(data)
    return out
  })
  queue = run.catch(() => {})
  return run
}

const key = (email, albumId) => `${email}::${albumId}`

export async function getReview (email, albumId) {
  return (await read())[key(email, albumId)] || null
}

export async function saveReview (r) {
  return mutate(data => {
    const k = key(r.userEmail, r.albumId)
    const now = new Date().toISOString()
    data[k] = {
      ...(data[k] || {}), ...r,
      createdAt: data[k]?.createdAt || r.createdAt || now,
      updatedAt: r.updatedAt || now
    }
    return data[k]
  })
}

// Scoped by key, not by a userEmail field. Discography entries and anything
// else stored per-user also carry that field, so matching on it alone pulls
// non-reviews into the library.
const isReviewKey = (k, email) => k.startsWith(`${email}::`)

export async function listReviews (email) {
  const data = await read()
  return Object.entries(data)
    .filter(([k, r]) => isReviewKey(k, email) && r)
    .map(([, r]) => r)
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
}

export async function deleteReview (email, albumId) {
  await mutate(data => { delete data[key(email, albumId)] })
}

// Only brand new reviews count against a daily limit; editing an old one is free.
export async function countToday (email) {
  const today = new Date().toISOString().slice(0, 10)
  const data = await read()
  return Object.entries(data)
    .filter(([k, r]) => isReviewKey(k, email) && (r?.createdAt || '').slice(0, 10) === today).length
}

// ---------- Standings snapshots ----------
// A frozen copy of the ranking, so the leaderboard can show what moved since.
const snapKey = email => `snapshot::${email}`

export async function getSnapshot (email) {
  return (await read())[snapKey(email)] || null
}

export async function saveSnapshot (email, ranks, ratings) {
  return mutate(data => {
    data[snapKey(email)] = { email, takenAt: new Date().toISOString(), ranks, ratings: ratings || {} }
    return data[snapKey(email)]
  })
}

export async function clearSnapshot (email) {
  await mutate(data => { delete data[snapKey(email)] })
}

// ---------- Hand-entered discography albums ----------
// One record per album, credited to every artist on it, so a collaboration is
// typed once and shows up in each of their discographies.
const discKey = (email, id) => `disc::${email}::${id}`

export async function listDiscography (email) {
  const data = await read()
  return Object.entries(data)
    .filter(([k]) => k.startsWith(`disc::${email}::`))
    .map(([, v]) => v)
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''))
}

export async function saveDiscographyEntry (email, entry) {
  return mutate(data => {
    const id = entry.id || `d${Date.now()}${Math.random().toString(36).slice(2, 7)}`
    data[discKey(email, id)] = { ...entry, id, userEmail: email }
    return data[discKey(email, id)]
  })
}

export async function deleteDiscographyEntry (email, id) {
  await mutate(data => { delete data[discKey(email, id)] })
}

// ---------- Public profiles ----------
// One record per account. The handle is looked up by scanning, which is fine
// here: this backend is the single-laptop one, and an index record would have
// to be kept in step through every rename.
const userKey = email => `user::${email}`

export async function getProfile (email) {
  return (await read())[userKey(email)] || null
}

export async function getProfileByHandle (handle) {
  const data = await read()
  const want = String(handle || '').toLowerCase()
  return Object.entries(data)
    .filter(([k]) => k.startsWith('user::'))
    .map(([, v]) => v)
    .find(u => (u.handle || '').toLowerCase() === want) || null
}

export async function listProfiles () {
  const data = await read()
  return Object.entries(data)
    .filter(([k]) => k.startsWith('user::'))
    .map(([, v]) => v)
}

export async function upsertProfile (email, patch) {
  return mutate(data => {
    const k = userKey(email)
    const now = new Date().toISOString()
    data[k] = {
      ...(data[k] || {}), ...patch,
      email,
      createdAt: data[k]?.createdAt || now,
      updatedAt: now
    }
    return data[k]
  })
}

// The same answer as the Postgres one. There is no index to lean on in a JSON
// file, so this reads and sorts, which is what a development store is for.
export async function listPublishedReviews ({ limit = 60, offset = 0 } = {}) {
  const data = await read()
  const rows = Object.entries(data)
    .filter(([k, v]) => k.includes('::') && v?.albumId && v?.published)
    .map(([, v]) => v)
    .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))
  return rows.slice(Math.max(0, offset), Math.max(0, offset) + Math.min(200, Math.max(1, limit)))
}

// ---------- Password resets ----------
const resetKey = h => `reset::${h}`

export async function createReset (tokenHash, email, expiresAt) {
  return mutate(data => {
    data[resetKey(tokenHash)] = { email, expiresAt, usedAt: null }
    return { email }
  })
}

export async function takeReset (tokenHash) {
  return mutate(data => {
    const row = data[resetKey(tokenHash)]
    if (!row || row.usedAt) return null
    if (new Date(row.expiresAt).getTime() <= Date.now()) return null
    row.usedAt = new Date().toISOString()
    return row.email
  })
}

export async function clearResets (email) {
  return mutate(data => {
    for (const [k, v] of Object.entries(data)) {
      if (k.startsWith('reset::') && v?.email === email && !v.usedAt) v.usedAt = new Date().toISOString()
    }
    return true
  })
}

// ---------- Billing ----------

export async function setSubscription (email, sub) {
  return mutate(data => {
    const k = userKey(email)
    if (!data[k]) return null
    data[k] = {
      ...data[k],
      tier: sub.tier,
      subscriptionId: sub.subscriptionId,
      subscriptionStatus: sub.subscriptionStatus,
      subscriptionVariant: sub.subscriptionVariant,
      subscriptionRenewsAt: sub.renewsAt,
      subscriptionEndsAt: sub.endsAt,
      updatedAt: new Date().toISOString()
    }
    return data[k]
  })
}

export async function getProfileBySubscription (subscriptionId) {
  const data = await read()
  const hit = Object.entries(data)
    .find(([k, u]) => k.startsWith('user::') && u.subscriptionId === subscriptionId)
  return hit ? hit[1] : null
}

// Claiming a handle has to be one step, or two people signing in at once can
// both find it free and both take it.
export async function claimHandle (email, handle) {
  return mutate(data => {
    const want = String(handle).toLowerCase()
    const taken = Object.entries(data)
      .filter(([k]) => k.startsWith('user::'))
      .some(([, u]) => (u.handle || '').toLowerCase() === want && u.email !== email)
    if (taken) return { ok: false }
    const k = userKey(email)
    const now = new Date().toISOString()
    data[k] = { ...(data[k] || {}), email, handle: want, createdAt: data[k]?.createdAt || now, updatedAt: now }
    return { ok: true, profile: data[k] }
  })
}

// ---------- Comments ----------
// Keyed by their own id and carrying the review they belong to, so a thread is
// a filter rather than a nested structure that has to be rewritten on a reply.
const commentKey = id => `comment::${id}`

export async function listComments (reviewId) {
  const data = await read()
  return Object.entries(data)
    .filter(([k, v]) => k.startsWith('comment::') && v.reviewId === reviewId)
    .map(([, v]) => v)
    .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))
}

export async function addComment (comment) {
  return mutate(data => {
    const id = comment.id || `c${Date.now()}${Math.random().toString(36).slice(2, 7)}`
    data[commentKey(id)] = { ...comment, id, createdAt: comment.createdAt || new Date().toISOString() }
    return data[commentKey(id)]
  })
}

export async function getComment (id) {
  return (await read())[commentKey(id)] || null
}

export async function deleteComment (id) {
  await mutate(data => { delete data[commentKey(id)] })
}

export async function countComments (reviewIds) {
  const data = await read()
  const want = new Set(reviewIds)
  const out = {}
  for (const [k, v] of Object.entries(data)) {
    if (!k.startsWith('comment::') || !want.has(v.reviewId)) continue
    out[v.reviewId] = (out[v.reviewId] || 0) + 1
  }
  return out
}

// How many replies someone has written, anywhere. Used by the achievements,
// which are counted rather than stored.
export async function countCommentsBy (email) {
  const data = await read()
  let n = 0
  for (const [k, v] of Object.entries(data)) {
    if (k.startsWith('comment::') && v.authorEmail === email) n++
  }
  return n
}

// ---------- Wiping an account ----------
// Two jobs that share their reasoning: what belongs to an account, listed once.
// Anything keyed by the address, plus the comments and votes it wrote, plus the
// follows it is either end of.
const ownedBy = (key, value, email) => {
  if (key.startsWith(`${email}::`)) return true                    // reviews
  for (const p of ['prefs::', 'snap::', 'cred::', 'user::']) {
    if (key === `${p}${email}`) return true
  }
  if (key.startsWith(`disc::`) && value?.userEmail === email) return true
  if (key.startsWith('gen::' + email + '::')) return true
  if (key.startsWith('comment::') && value?.authorEmail === email) return true
  if (key.startsWith('vote::') && value?.email === email) return true
  if (key.startsWith('follow::') && (value?.follower === email || value?.target === email)) return true
  return false
}

// Everything someone made, with the account left standing so they can start
// again without signing up twice.
export async function deleteAccountData (email) {
  let n = 0
  await mutate(data => {
    for (const [k, v] of Object.entries(data)) {
      if (k === `cred::${email}` || k === `user::${email}`) continue
      if (ownedBy(k, v, email)) { delete data[k]; n++ }
    }
  })
  return n
}

export async function deleteAccount (email) {
  let n = 0
  await mutate(data => {
    for (const [k, v] of Object.entries(data)) {
      if (ownedBy(k, v, email)) { delete data[k]; n++ }
    }
  })
  return n
}

// ---------- Slide generations ----------
// One row per account per day per album. Producing slides for the same record
// twice in a day is one generation, not two: the limit is about how much you
// put out, and re-exporting after fixing a typo is not putting out more.
const genKey = (email, day, albumId) => `gen::${email}::${day}::${albumId}`
const today = () => new Date().toISOString().slice(0, 10)

export async function recordGeneration (email, albumId) {
  await mutate(data => {
    data[genKey(email, today(), String(albumId))] = {
      email, albumId: String(albumId), day: today(), at: new Date().toISOString()
    }
  })
}

export async function countGenerationsToday (email) {
  const data = await read()
  const prefix = `gen::${email}::${today()}::`
  let n = 0
  for (const k of Object.keys(data)) if (k.startsWith(prefix)) n++
  return n
}

export async function generatedToday (email, albumId) {
  return Boolean((await read())[genKey(email, today(), String(albumId))])
}

// ---------- Votes ----------
// One row per person per review, so a second vote replaces the first rather
// than stacking. Value is 1 or -1; nothing else is stored, and clearing a vote
// deletes the row.
const voteKey = (reviewId, email) => `vote::${reviewId}::${email}`

export async function castVote (reviewId, email, value) {
  await mutate(data => {
    const k = voteKey(reviewId, email)
    if (value === 1 || value === -1) {
      data[k] = { reviewId, email, value, createdAt: new Date().toISOString() }
    } else {
      delete data[k]
    }
  })
}

export async function voteTotals (reviewIds) {
  const data = await read()
  const want = new Set(reviewIds)
  const out = {}
  for (const [k, v] of Object.entries(data)) {
    if (!k.startsWith('vote::') || !want.has(v.reviewId)) continue
    const row = out[v.reviewId] || (out[v.reviewId] = { up: 0, down: 0, score: 0 })
    if (v.value === 1) row.up++; else row.down++
    row.score += v.value
  }
  return out
}

export async function myVotes (email, reviewIds) {
  const data = await read()
  const out = {}
  for (const id of reviewIds) {
    const v = data[voteKey(id, email)]
    if (v) out[id] = v.value
  }
  return out
}

// ---------- Follows ----------
const followKey = (follower, target) => `follow::${follower}::${target}`

export async function follow (follower, target) {
  if (follower === target) return
  await mutate(data => {
    data[followKey(follower, target)] = {
      follower, target, createdAt: new Date().toISOString()
    }
  })
}

export async function unfollow (follower, target) {
  await mutate(data => { delete data[followKey(follower, target)] })
}

export async function isFollowing (follower, target) {
  return Boolean((await read())[followKey(follower, target)])
}

export async function listFollowing (email) {
  const data = await read()
  return Object.entries(data)
    .filter(([k]) => k.startsWith(`follow::${email}::`))
    .map(([, v]) => v.target)
}

export async function listFollowers (email) {
  const data = await read()
  return Object.entries(data)
    .filter(([k, v]) => k.startsWith('follow::') && v.target === email)
    .map(([, v]) => v.follower)
}

// ---------- Passwords ----------
// Kept apart from the profile on purpose. getProfile feeds pages and API
// responses, and a hash that lives on that record is one careless spread away
// from being serialised into a page.
const credKey = email => `cred::${email}`

export async function getCredentials (email) {
  return (await read())[credKey(email)] || null
}

export async function setPassword (email, passwordHash) {
  return mutate(data => {
    data[credKey(email)] = { email, passwordHash, updatedAt: new Date().toISOString() }
    return { email }
  })
}

// ---------- Rating model ----------
// Which criteria a rater scores on and which superlatives they hand out. Kept
// in its own record rather than on the profile: the profile is public and this
// is not, and mixing them means one careless projection publishes the other.
const prefsKey = email => `prefs::${email}`

export async function getPreferences (email) {
  return (await read())[prefsKey(email)]?.value ?? null
}

export async function savePreferences (email, value) {
  return mutate(data => {
    data[prefsKey(email)] = { email, value, updatedAt: new Date().toISOString() }
    return value
  })
}
