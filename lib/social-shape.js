// Everything a stranger is allowed to see, and nothing else. The account key is
// an email address, so the rule is simple: nothing leaving this module carries
// one. Pages take handles; the store takes emails; this is the seam.
import { NA } from './rating-scale.js'
import { DEFAULT_CRITERIA } from './preferences.js'
import { resolveSelections } from './auto-picks.js'
import { MAX_SCORE } from './rating-scale.js'

// The top of the ladder a review was actually rated on. Falls back to the house
// eleven for reviews saved before a scale was stored with them.
const topOf = r => Number(r?.scaleModel?.max) || MAX_SCORE

// A card on a profile or a discovery page.
export const publicCard = r => ({
  albumId: r.albumId,
  albumName: r.albumName,
  artist: r.artist,
  cover: r.cover,
  year: r.year,
  final: r.final ?? null,
  scaleModel: r.scaleModel ?? null,
  songs: r.album?.tracks?.length ?? 0,
  updatedAt: r.updatedAt ?? null
})

// A card that has something to read on it. The feed used to be a row of album
// names, which said nothing about the rating and gave nobody a reason to open
// one. Everything here comes off the review already in hand, so a richer feed
// costs no extra queries.
export const publicPost = r => {
  const scores = Object.values(r.scores ?? {}).filter(v => typeof v === 'number')
  const sel = r.selections ?? {}
  const top = Math.max(...(scores.length ? scores : [0]))
  return {
    ...publicCard(r),
    scored: scores.length,
    // Against this review's own ladder, not a fixed eleven. A rater on the ten
    // point scale could never show a top mark, and one on the hundred point
    // scale had elevens counted as perfect scores.
    topMarks: scores.filter(v => v >= topOf(r)).length,
    skits: Object.values(r.scores ?? {}).filter(v => v === NA).length,
    songAverage: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
    highestSong: scores.length ? top : null,
    bestSong: sel.bestSong ?? null,
    worstSong: sel.worstSong ?? null,
    // The criteria that were actually given a number, in the order they were
    // asked, so a card can show what the rating was built out of.
    criteria: (r.criteriaModel?.length ? r.criteriaModel : DEFAULT_CRITERIA)
      .map(({ key, label }) => ({
        key, label,
        value: Number.isFinite(Number(r.criteria?.[key])) ? Number(r.criteria[key]) : null
      }))
      .filter(c => c.value !== null),
    createdAt: r.createdAt ?? null
  }
}

// The full review page. Tracks are joined to their scores here so the client
// never receives a bare id map it has to reconcile.
export const publicReview = r => ({
  albumId: r.albumId,
  albumName: r.albumName,
  artist: r.artist,
  cover: r.cover,
  year: r.year,
  final: r.final ?? null,
  scaleModel: r.scaleModel ?? null,
  criteria: (r.criteriaModel?.length ? r.criteriaModel : DEFAULT_CRITERIA).map(({ key, label }) => ({
    key, label, value: Number.isFinite(Number(r.criteria?.[key])) ? Number(r.criteria[key]) : null
  })),
  selections: resolveSelections(r.selections, r.scores, r.album?.tracks),
  tracks: (r.album?.tracks ?? []).map((t, i) => ({
    id: String(t.id),
    n: t.trackNumber ?? i + 1,
    title: t.name,
    features: t.features ?? [],
    durationMs: t.durationMs ?? 0,
    score: r.scores?.[String(t.id)] ?? null
  })),
  runtimeMs: r.album?.runtimeMs ?? 0,
  createdAt: r.createdAt ?? null,
  updatedAt: r.updatedAt ?? null
})

// What a rater's body of work looks like from outside. Derived from published
// reviews only, so the number on a profile matches the albums a visitor can
// actually open.
export function raterStats (reviews) {
  const scored = reviews.filter(r => typeof r.final === 'number')
  const songScores = reviews.flatMap(r =>
    Object.values(r.scores ?? {}).filter(v => typeof v === 'number'))
  const skits = reviews.flatMap(r =>
    Object.values(r.scores ?? {}).filter(v => v === NA)).length
  const years = reviews.map(r => Number(r.year)).filter(y => Number.isFinite(y) && y > 0)

  return {
    albums: reviews.length,
    songs: songScores.length,
    skits,
    // Each review counted against the ladder it was rated on, so a library
    // spanning two scales still totals something meaningful.
    topMarks: reviews.reduce((n, r) => n + Object.values(r.scores ?? {})
      .filter(v => typeof v === 'number' && v >= topOf(r)).length, 0),
    average: scored.length
      ? scored.reduce((a, r) => a + r.final, 0) / scored.length
      : null,
    highest: scored.length
      ? scored.reduce((best, r) => (r.final > best.final ? r : best))
      : null,
    span: years.length ? [Math.min(...years), Math.max(...years)] : null
  }
}

// A comment as it appears in a thread: the author is a handle and a picture,
// never an address.
export const publicComment = (c, author) => ({
  id: c.id,
  body: c.body,
  createdAt: c.createdAt,
  author: author
    ? { handle: author.handle, name: author.name || author.handle, image: author.image || null }
    : { handle: null, name: 'Deleted account', image: null }
})
