// What to rate next.
//
// Two sources, in this order, because they answer two different questions:
// more by an artist you already rated highly, and a record by somebody the
// catalogue files next to them. The first is the safer bet and the second is
// the reason to come back, so the list is a mix rather than all of one.
//
// An empty library gets the wall instead: the same records the landing page
// plays, which are chosen to be recognisable rather than obscure. A new account
// staring at an empty search box has nothing to press, and "type something" is
// a worse first screen than twenty records everybody has an opinion about.

import { discographyByName, relatedArtists } from './music.js'
import { albumKey } from './preferences.js'
import { MAX_SCORE } from './rating-scale.js'

// How many artists to build the list from, and how much to ask of the
// catalogue. Every one of these is a network call on a cold cache, so the
// budget is small on purpose: a suggestion strip may not be the reason a page
// is slow.
const SEED_ARTISTS = 4
const RELATED_SEEDS = 2
const PER_ARTIST = 2

// A score means nothing without the ladder it was given on, so everything is
// compared as a fraction of its own scale.
// A reissue, a live record or a crossover project is a bad first suggestion:
// somebody who liked one album wants the next album, not its director's cut.
const SIDE_PROJECT = /anniversar|deluxe|remaster|edition|reissue|live|instrumental|karaoke|greatest hits|best of|the remixes|director's cut|\bx\b|ensemble|orchestra|symphon|soundtrack|original score|\bost\b|motion picture|netflix|season \d|\bep\b|single|commentary/i
const worthSuggesting = name => !SIDE_PROJECT.test(String(name || ''))

const strength = r => {
  if (typeof r.final !== 'number') return null
  const top = Number(r.scaleModel?.max) || MAX_SCORE
  return top > 0 ? r.final / top : null
}

const shuffleBy = (list, seed) => {
  // Deterministic per day, so the strip changes between visits without
  // reshuffling on every render and disagreeing between server and client.
  const out = [...list]
  let h = seed
  for (let i = out.length - 1; i > 0; i--) {
    h = (h * 1103515245 + 12345) & 0x7fffffff
    const j = h % (i + 1)
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

// The fallback list is passed in rather than imported, so this module has no
// opinion about where "popular" comes from and can be tested without it.
const fromWall = (wall, limit, seed) =>
  shuffleBy(wall, seed).slice(0, limit).map(a => ({
    // The wall stores a preview id, not an album id, so these link to a search
    // rather than straight into a rating. Pressing one still lands on the
    // record; it just goes through the catalogue to get there.
    query: `${a.artist} ${a.name}`,
    name: a.name,
    artist: a.artist,
    cover: a.cover,
    year: null,
    reason: null
  }))

export async function suggestionsFor (reviews = [], { limit = 12, seed = 0, popular = [] } = {}) {
  const already = new Set(reviews.map(r => albumKey(r.artist, r.albumName)))
  const seenArtist = new Set(reviews.map(r => String(r.artist || '').toLowerCase().trim()))

  if (!reviews.length) return { kind: 'popular', items: fromWall(popular, limit, seed) }

  // The artists worth building on: best rating first, and a second rating by
  // the same artist counts for something on its own.
  const byArtist = new Map()
  for (const r of reviews) {
    const s = strength(r)
    if (s === null || !r.artist) continue
    const e = byArtist.get(r.artist) || { artist: r.artist, best: 0, n: 0 }
    e.best = Math.max(e.best, s)
    e.n++
    byArtist.set(r.artist, e)
  }
  const seeds = [...byArtist.values()]
    .sort((a, b) => (b.best - a.best) || (b.n - a.n))
    .slice(0, SEED_ARTISTS)

  if (!seeds.length) return { kind: 'popular', items: fromWall(popular, limit, seed) }

  const picked = []
  const take = a => {
    if (picked.length >= limit) return
    if (already.has(albumKey(a.artist, a.name))) return
    if (picked.some(p => albumKey(p.artist, p.name) === albumKey(a.artist, a.name))) return
    picked.push(a)
  }

  // More by the artists themselves.
  const own = await Promise.all(seeds.map(async s => {
    const albums = await discographyByName(s.artist).catch(() => [])
    return albums
      .filter(a => !already.has(albumKey(s.artist, a.name)))
      .filter(a => worthSuggesting(a.name))
      .slice(0, PER_ARTIST)
      .map(a => ({
        id: a.id, name: a.name, artist: s.artist, cover: a.cover, year: a.year,
        reason: `More by ${s.artist}`
      }))
  }))

  // And somebody next to them. Only the top couple of artists are expanded
  // this way, because each one is another round trip.
  const near = await Promise.all(seeds.slice(0, RELATED_SEEDS).map(async s => {
    const others = (await relatedArtists(s.artist).catch(() => []))
      .filter(n => !seenArtist.has(n.toLowerCase().trim()))
      .slice(0, 3)
    const albums = await Promise.all(others.map(async n => {
      const list = await discographyByName(n).catch(() => [])
      const first = list.find(a => !already.has(albumKey(n, a.name)) && worthSuggesting(a.name))
      return first
        ? { id: first.id, name: first.name, artist: n, cover: first.cover, year: first.year,
            reason: `Because you rated ${s.artist}` }
        : null
    }))
    return albums.filter(Boolean)
  }))

  // Interleaved rather than one source then the other, so the strip does not
  // read as two lists stuck together.
  const a = own.flat()
  const b = near.flat()
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i]) take(a[i])
    if (b[i]) take(b[i])
  }

  // A library of one artist with nothing left to rate still gets a strip.
  if (picked.length < 4) {
    for (const w of fromWall(popular, limit - picked.length, seed)) take(w)
  }

  return { kind: 'personal', items: picked.slice(0, limit) }
}
