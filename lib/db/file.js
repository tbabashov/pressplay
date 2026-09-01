// Development store. The file is the single source of truth and is re-read on
// every write, because more than one process touches it: the dev server, and
// any script run from a terminal. An in-process cache here means whichever
// process writes last silently overwrites the other's records.
import fs from 'fs/promises'
import path from 'path'

const DIR = path.join(process.cwd(), '.data')
const FILE = path.join(DIR, 'reviews.json')

export async function init () {
  await fs.mkdir(DIR, { recursive: true })
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
