import { NA, MAX_SCORE } from './rating-scale.js'
import { DEFAULT_CRITERIA } from './preferences.js'

const mean = xs => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

// Everything on the taste page comes out of the reviews already stored. Nothing
// here is an estimate: if a figure cannot be derived it is left out rather than
// filled in with something plausible.
export function taste (reviews) {
  const rated = reviews.filter(r => typeof r.final === 'number')

  // Every song score, flattened, with skits kept apart because they are
  // deliberately outside every average.
  //
  // A top mark is counted against the ladder its own review was rated on, not
  // against a fixed eleven. Counting elevens made no sense once a scale could
  // be anything: on a ten point ladder nobody can reach it and the figure sat
  // at zero forever, and on a hundred point one an eleven is a poor score being
  // counted as a perfect one.
  const songs = []
  let skits = 0
  let topMarks = 0
  for (const r of reviews) {
    const top = Number(r.scaleModel?.max) || MAX_SCORE
    for (const v of Object.values(r.scores ?? {})) {
      if (v === NA) skits++
      else if (typeof v === 'number') {
        songs.push(v)
        if (v >= top) topMarks++
      }
    }
  }

  // The ladder itself: how many songs landed on each rung. The ladder is as
  // tall as the tallest scale actually used, so a hundred point rater sees all
  // of their scores instead of only the ones that happened to fall under 11.
  const ceiling = Math.max(
    MAX_SCORE,
    ...reviews.map(r => Number(r.scaleModel?.max) || 0),
    ...songs.map(v => Math.round(v))
  )
  const buckets = Array.from({ length: ceiling + 1 }, (_, n) => ({ score: n, count: 0 }))
  for (const v of songs) {
    const n = Math.round(v)
    if (n >= 0 && n <= ceiling) buckets[n].count++
  }
  const peak = Math.max(1, ...buckets.map(b => b.count))

  // Which criteria the rater is hardest on. Only the ones actually filled in
  // vote, the same rule the score itself follows.
  // Whatever criteria appear across the reviews, not a fixed five: a rater who
  // renamed or replaced theirs should see their own names here.
  const model = new Map()
  for (const r of reviews) {
    for (const c of (r.criteriaModel?.length ? r.criteriaModel : DEFAULT_CRITERIA)) {
      if (!model.has(c.key)) model.set(c.key, c.label)
    }
  }
  const criteria = [...model.entries()].map(([key, label]) => {
    const vals = reviews
      .map(r => Number(r.criteria?.[key]))
      .filter(v => Number.isFinite(v))
    return { key, label, avg: mean(vals), n: vals.length }
  }).filter(c => c.avg !== null)

  // Artists by how many of their records have been rated.
  const byArtist = new Map()
  for (const r of rated) {
    const a = (r.artist || '').trim()
    if (!a) continue
    const e = byArtist.get(a) || { artist: a, albums: 0, total: 0 }
    e.albums++; e.total += r.final
    byArtist.set(a, e)
  }
  const artists = [...byArtist.values()]
    .map(e => ({ ...e, avg: e.total / e.albums }))
    .sort((x, y) => (y.albums - x.albums) || (y.avg - x.avg))
    .slice(0, 8)

  // Decades, so the shape of what someone reaches for is visible at a glance.
  const byDecade = new Map()
  for (const r of rated) {
    const y = Number(r.year)
    if (!Number.isFinite(y) || y < 1900) continue
    const d = Math.floor(y / 10) * 10
    const e = byDecade.get(d) || { decade: d, albums: 0, total: 0 }
    e.albums++; e.total += r.final
    byDecade.set(d, e)
  }
  const decades = [...byDecade.values()]
    .map(e => ({ ...e, avg: e.total / e.albums }))
    .sort((x, y) => x.decade - y.decade)
  const widest = Math.max(1, ...decades.map(d => d.albums))

  return {
    albums: rated.length,
    songs: songs.length,
    skits,
    topMarks,
    average: mean(rated.map(r => r.final)),
    songAverage: mean(songs),
    buckets,
    peak,
    criteria,
    hardest: criteria.length ? criteria.reduce((a, b) => (a.avg <= b.avg ? a : b)) : null,
    softest: criteria.length ? criteria.reduce((a, b) => (a.avg >= b.avg ? a : b)) : null,
    artists,
    decades,
    widest,
    best: rated.length
      ? (({ albumId, albumName, artist, cover, final }) => ({ albumId, albumName, artist, cover, final }))(
          rated.reduce((a, b) => (a.final >= b.final ? a : b)))
      : null
  }
}
