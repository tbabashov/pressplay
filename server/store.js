import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { RENAMED_CRITERIA } from '../src/rating.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, '..', 'data')
const DB_FILE = path.join(DATA_DIR, 'db.json')

const DEFAULT_TIERS = {
  11: 'Majestic',
  10: 'Perfect', 9: 'Amazing', 8: 'Great', 7: 'Good', 6: 'Decent',
  5: 'Mid', 4: 'Meh', 3: 'Bad', 2: 'Awful', 1: 'Terrible', 0: 'Abysmal',
  skit: 'N/A'
}

const EMPTY = () => ({
  reviews: [],
  tierLabels: { ...DEFAULT_TIERS },
  // Albums an artist released that haven't been rated yet — typed by hand,
  // never fetched, so the discography frames only ever show what's vouched for.
  discography: [],
  // Frozen leaderboards used as the "before" side of an update video.
  snapshots: [],
  // Bullet points announced at the top of an update video.
  updateNotes: [],
  sessions: []
})

function load () {
  if (!fs.existsSync(DB_FILE)) return EMPTY()
  const db = { ...EMPTY(), ...JSON.parse(fs.readFileSync(DB_FILE, 'utf8')) }
  db.tierLabels = { ...DEFAULT_TIERS, ...db.tierLabels }
  // Databases written before the 11-point scale label the top tier as a skit;
  // rename it in place so the legend and dropdowns agree with the new frames.
  if (/^skit/i.test(db.tierLabels.skit || '')) db.tierLabels.skit = 'N/A'
  return db
}

// Accessibility and Consistency became Delivery and Album Experience. The
// numbers move across rather than being dropped, so no album silently loses two
// of its six inputs and no final rating shifts on its own — but the two slots
// now mean something different, so those albums are worth re-checking.
function migrateCriteria (db) {
  let changed = false
  for (const review of db.reviews) {
    if (!review.criteria) continue
    for (const [from, to] of Object.entries(RENAMED_CRITERIA)) {
      if (!(from in review.criteria)) continue
      if (review.criteria[to] === undefined) review.criteria[to] = review.criteria[from]
      delete review.criteria[from]
      changed = true
    }
  }
  return changed
}

let db = load()

function save () {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2))
}

if (migrateCriteria(db)) {
  save()
  console.log('Criteria renamed: Accessibility → Delivery, Consistency → Album Experience')
}

export const store = {
  get db () { return db },
  save,

  getReview (albumId) {
    return db.reviews.find(r => r.albumId === albumId) || null
  },

  upsertReview (review) {
    const i = db.reviews.findIndex(r => r.albumId === review.albumId)
    const now = new Date().toISOString()
    if (i >= 0) {
      review.createdAt = db.reviews[i].createdAt
      review.updatedAt = now
      db.reviews[i] = review
    } else {
      review.createdAt = now
      review.updatedAt = now
      db.reviews.push(review)
    }
    save()
    return review
  },

  deleteReview (albumId) {
    db.reviews = db.reviews.filter(r => r.albumId !== albumId)
    save()
  },

  getTierLabels () { return db.tierLabels },

  setTierLabels (labels) {
    db.tierLabels = { ...db.tierLabels, ...labels }
    save()
    return db.tierLabels
  },

  // ---------- Manual discography entries ----------
  getDiscography () { return db.discography },

  upsertDiscographyEntry (entry) {
    const i = db.discography.findIndex(e => e.id === entry.id)
    if (i >= 0) db.discography[i] = { ...db.discography[i], ...entry }
    else db.discography.push(entry)
    save()
    return entry
  },

  deleteDiscographyEntry (id) {
    db.discography = db.discography.filter(e => e.id !== id)
    save()
  },

  // ---------- Leaderboard snapshots ----------
  getSnapshots () { return db.snapshots },

  addSnapshot (snapshot) {
    db.snapshots.push(snapshot)
    // a handful of restore points is plenty; the oldest are the least useful
    if (db.snapshots.length > 12) db.snapshots = db.snapshots.slice(-12)
    save()
    return snapshot
  },

  deleteSnapshot (id) {
    db.snapshots = db.snapshots.filter(s => s.id !== id)
    save()
  },

  getUpdateNotes () { return db.updateNotes },

  setUpdateNotes (notes) {
    db.updateNotes = notes
    save()
    return db.updateNotes
  },

  addSession (token) {
    db.sessions.push(token)
    if (db.sessions.length > 20) db.sessions = db.sessions.slice(-20)
    save()
  },

  hasSession (token) {
    return db.sessions.includes(token)
  }
}
