// Featured artists, from Apple's catalogue, for the records the main one has no
// credits for.
//
// Deezer returns no contributors and no "(feat. X)" in the title for a large
// part of its catalogue: Certified Lover Boy comes back with none of its
// eleven credited features. Apple has them in the track name, which is the
// label's own credit line rather than anything a user typed, so what it says is
// what the record says.
//
// That is the reason this is Apple and not MusicBrainz. MusicBrainz also has
// the data, but mixed with remixes and bootleg releases: scoped to an album it
// put Lupe Fiasco on Sicko Mode and invented features for three other tracks,
// about half of them wrong. There is no such thing here, because there is only
// one official version of a track name.
//
// It cannot conjure a credit nobody published. ASTROWORLD is uncredited on
// Apple too, and stays uncredited here.

import { creditsFrom } from './credits.js'

const API = 'https://itunes.apple.com'

// Two catalogues punctuate differently, so titles meet on letters and digits.
export const titleKey = t => String(t || '')
  .toLowerCase()
  .normalize('NFKD').replace(/[̀-ͯ]/g, '')
  .replace(/\s*[([].*$/, '')
  .replace(/[^a-z0-9]+/g, '')

const get = async (path, signal) => {
  const res = await fetch(`${API}${path}`, {
    signal,
    // The same window the catalogue lookups use. It also keeps this well under
    // the roughly twenty requests a minute Apple allows an anonymous caller.
    next: { revalidate: 86400 }
  })
  if (!res.ok) return null
  // Apple serves this as text/javascript, so res.json() is not safe to assume.
  const text = await res.text()
  try { return JSON.parse(text) } catch { return null }
}

// Featured artists by track title. Returns {} rather than throwing on anything:
// this is an enrichment, and an album that loads without its guest credits is
// far better than one that does not load.
export async function featuresByTitle (artist, album, mains = [], { signal } = {}) {
  if (!artist || !album) return {}

  const search = await get(
    `/search?term=${encodeURIComponent(`${artist} ${album}`)}&entity=album&limit=10`, signal)
  if (!search?.results?.length) return {}

  // The right record, not merely the first one back. A deluxe edition is fine
  // and often better, since it is a superset; another album by the same artist
  // is not.
  const want = titleKey(album)
  const hit = search.results.find(r => titleKey(r.collectionName) === want) ||
    search.results.find(r => titleKey(r.collectionName).startsWith(want))
  if (!hit?.collectionId) return {}

  const songs = await get(`/lookup?id=${hit.collectionId}&entity=song&limit=200`, signal)
  if (!songs?.results?.length) return {}

  // Everyone credited as a main artist is not a guest on their own record.
  const isMain = new Set([artist, ...mains].filter(Boolean).map(n => n.toLowerCase().trim()))

  const out = {}
  for (const row of songs.results) {
    if (row.wrapperType !== 'track' || !row.trackName) continue
    const parsed = creditsFrom(row.trackName)
    const guests = parsed.features.filter(n => !isMain.has(n.toLowerCase().trim()))
    if (!guests.length) continue
    const k = titleKey(parsed.title || row.trackName)
    if (k) out[k] = guests
  }
  return out
}
