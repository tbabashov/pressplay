// Featured artists, from Discogs, for what the catalogues do not say.
//
// Apple carries a credit only when the label put it in the track name. Where a
// record lists its guests in the metadata beside the song instead, Apple's
// track name is bare and there is nothing to extract: ASTROWORLD comes back
// with none of its features that way. Discogs holds them as their own field,
// so a track knows who is on it whether or not the title mentions anybody.
//
// A submission there is typed by a person, so this is not the label's word the
// way a track name is. What makes it usable anyway is the shape of the data:
// a Featuring credit is a role on a named artist, not prose, so there is
// nothing to parse and nothing to guess at. What it costs is that a thin
// submission simply has no credits rather than wrong ones, which is the safe
// way for this to fail.
//
// Quality varies between pressings of one record — of four releases of the
// same album, one credited three tracks and the others credited none — so this
// reads a few and merges them rather than trusting whichever came back first.

import { creditsFrom } from './credits.js'
import { titleKey } from './apple-credits.js'

const API = 'https://api.discogs.com'

// Discogs asks callers to identify themselves and refuses anonymous ones.
const UA = 'PressPlayRankings/1.0 (+https://pressplay-cyan.vercel.app)'

// How many pressings to open before giving up, and when to stop early.
//
// Credits are not spread evenly: of ten pressings of ASTROWORLD exactly two
// carried them, and search does not return them in a stable order, so opening
// the first three is a coin toss. A pressing that has credits tends to have
// nearly all of them though — eleven and twelve of seventeen tracks on those
// two — so the useful shape is to keep opening until one answers and then
// stop, rather than to open a fixed number and merge.
const RELEASES = 6

// Two artists of the same name are told apart by a trailing number that is not
// part of anybody's name: Travis Scott (2).
const cleanName = n => String(n || '').replace(/\s*\(\d+\)\s*$/, '').trim()

const same = (a, b) => titleKey(a) === titleKey(b)

async function get (path, signal) {
  const token = process.env.DISCOGS_TOKEN
  const url = `${API}${path}${token ? `${path.includes('?') ? '&' : '?'}token=${token}` : ''}`
  try {
    const res = await fetch(url, {
      signal,
      headers: { 'User-Agent': UA },
      // A day, like the catalogue lookups. Unauthenticated callers get about
      // twenty five requests a minute, and cached is how this stays under it.
      next: { revalidate: 86400 }
    })
    if (!res.ok) return null
    return await res.json()
  } catch { return null }
}

// Which releases might be this record. The structured search matches a
// stylised title that a plain query misses — $ome $exy $ongs is filed under
// its stylised name and found by release_title anyway — and the loose one
// catches a record whose artist is spelled differently between catalogues.
async function findReleases (artist, album, signal) {
  const structured = await get(
    `/database/search?type=release&per_page=8&artist=${encodeURIComponent(artist)}` +
    `&release_title=${encodeURIComponent(album)}`, signal)
  let hits = structured?.results || []

  if (!hits.length) {
    const loose = await get(
      `/database/search?type=release&per_page=8&q=${encodeURIComponent(`${artist} ${album}`)}`, signal)
    // A loose query matches on anything, so the album half of "Artist - Album"
    // has to actually be the album before its credits are believed.
    hits = (loose?.results || []).filter(r => {
      const half = String(r.title || '').split(' - ').slice(1).join(' - ')
      return half && same(half, album)
    })
  }
  return hits.slice(0, RELEASES).map(r => r.id).filter(Boolean)
}

// Everyone a track credits who is not one of the record's own artists.
// Exported for its own sake: this is the whole judgement this module makes.
export function guestsOn (track, mains) {
  const names = new Set()

  for (const a of track.extraartists || []) {
    if (/featur/i.test(a.role || '')) names.add(cleanName(a.name))
  }
  // Some submissions credit a guest as an artist of the track rather than as a
  // Featuring role. Anyone already on the sleeve is not a guest on it.
  for (const a of track.artists || []) names.add(cleanName(a.name))
  // And some put it in the title after all, the way Apple does.
  for (const n of creditsFrom(track.title).features) names.add(n)

  const own = new Set(mains.map(n => String(n).toLowerCase().trim()))
  return [...names].filter(n => n && !own.has(n.toLowerCase()))
}

// A map of track title to the guests on it. Empty when Discogs has nothing,
// which is not the same as the record having nobody — a thin submission and an
// album with no features look alike from here.
export async function featuresByTitle (artist, album, mains = [], signal) {
  if (!artist || !album) return {}

  const ids = await findReleases(artist, album, signal)
  if (!ids.length) return {}

  const out = {}
  for (const id of ids) {
    // One good pressing is the whole answer. Opening the rest would spend five
    // more requests to confirm what this one already said.
    if (Object.keys(out).length) break
    const release = await get(`/releases/${id}`, signal)
    // The sleeve's own artists, plus whatever the caller already knows, so a
    // main artist is never listed as a guest on their own record.
    const own = [...mains, ...(release?.artists || []).map(a => cleanName(a.name))]

    for (const track of release?.tracklist || []) {
      // Vinyl runs list sides and headings as untitled positions.
      if (!track.title || track.type_ === 'heading') continue
      const guests = guestsOn(track, own)
      if (!guests.length) continue

      const key = titleKey(track.title)
      const known = new Set((out[key] || []).map(n => n.toLowerCase()))
      out[key] = [...(out[key] || []), ...guests.filter(n => !known.has(n.toLowerCase()))]
    }
  }
  return out
}
