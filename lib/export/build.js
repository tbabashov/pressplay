// Turns a saved review plus the rest of your library into the shape the export
// frames were written against. Covers come back as data URLs because the
// rasteriser draws through an SVG foreignObject, where remote images never load.
import { listReviews, listDiscography, getPreferences } from '../db/index.js'
import { getAlbum, discographyByName } from '../music.js'
import { NA, MAX_SCORE } from '../rating-scale.js'
import { artUrl } from '../../app/api/art/shared.js'
import { DEFAULT_CRITERIA, normalisePreferences, albumKey } from '../preferences.js'

export const TIER_LABELS = {
  11: 'Majestic', 10: 'Perfect', 9: 'Amazing', 8: 'Great', 7: 'Good', 6: 'Decent',
  5: 'Mid', 4: 'Meh', 3: 'Bad', 2: 'Awful', 1: 'Terrible', 0: 'Abysmal', [NA]: 'N/A'
}

// Covers reach the frames through the same-origin proxy rather than inlined.
// html-to-image only needs the canvas untainted, which same-origin gives it,
// and inlining turned every cover into a 400KB string in the page's props: a
// single export was shipping three megabytes and blowing the render's stack on
// a cold load. The proxy already allows every host these covers come from.
const ART_HOSTS = /(^|\.)(dzcdn\.net|mzstatic\.com|scdn\.co|discogs\.com)$/

function proxied (url) {
  if (!url) return ''
  if (url.startsWith('data:') || url.startsWith('/')) return url
  try {
    const u = new URL(url)
    if (u.protocol === 'https:' && ART_HOSTS.test(u.hostname)) {
      return artUrl(url)
    }
  } catch { /* not a URL; fall through and inline it */ }
  return null   // the proxy will not serve it, so it has to be inlined
}

async function embed (url) {
  if (!url) return ''
  if (url.startsWith('data:')) return url
  const viaProxy = proxied(url)
  if (viaProxy) return viaProxy
  try {
    const r = await fetch(url, { cache: 'force-cache' })
    if (!r.ok) return ''
    const buf = Buffer.from(await r.arrayBuffer())
    return `data:${r.headers.get('content-type') || 'image/jpeg'};base64,${buf.toString('base64')}`
  } catch { return '' }
}

const songAverage = scores => {
  const v = Object.values(scores || {}).filter(x => typeof x === 'number')
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
}

export function ratingParts (review) {
  const c = review.criteria || {}
  return [
    { key: 'songAverage', label: 'Song Average', value: songAverage(review.scores), auto: true },
    ...(review.criteriaModel?.length ? review.criteriaModel : DEFAULT_CRITERIA)
      .map(({ key, label }) => {
      const n = Number(c[key])
      return { key, label, value: c[key] !== '' && c[key] !== undefined && Number.isFinite(n) ? n : null, auto: false }
    })
  ]
}

export function finalRating (review) {
  const manual = Number(review.finalOverride)
  if (review.finalOverride && Number.isFinite(manual)) return manual
  const vals = ratingParts(review).map(p => p.value).filter(v => typeof v === 'number')
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
}

export async function buildExport (email, albumId, opts = {}) {
  const all = await listReviews(email)
  const mine = all.find(r => r.albumId === String(albumId))
  if (!mine) return null

  // Prefer the stored snapshot: it is what the review was actually scored
  // against, and imported albums are not in the catalogue at all.
  let snapshot = mine.album
  if (!snapshot) {
    const fresh = await getAlbum(albumId)
    const { toSnapshot } = await import('../album-shape.js')
    snapshot = toSnapshot(fresh)
  }

  // Everything downstream reads album.artists and album.tracks straight, and
  // several of them call .join or [0] on it. A stored album that is missing
  // either — an old row, a partial save, an import that never carried one —
  // therefore took down the whole export page with a server side exception
  // rather than losing one line of a slide. Filled in once here, where there
  // is a name to fall back on, instead of guarded at nine call sites.
  snapshot = {
    ...snapshot,
    name: snapshot.name || mine.albumName || 'Untitled',
    artists: Array.isArray(snapshot.artists) && snapshot.artists.length
      ? snapshot.artists
      : [mine.artist || 'Unknown artist'],
    // Same for the tracks. The frames call .features.join and .name on every
    // row, so one track saved without them took the page down rather than
    // rendering one row short.
    tracks: (Array.isArray(snapshot.tracks) ? snapshot.tracks : []).map((t, i) => ({
      ...t,
      id: String(t?.id ?? i),
      name: t?.name || 'Untitled',
      features: Array.isArray(t?.features) ? t.features : [],
      trackNumber: t?.trackNumber ?? i + 1,
      durationMs: Number.isFinite(t?.durationMs) ? t.durationMs : 0
    }))
  }

  // Everything you have scored, ranked, so this album knows where it sits.
  const ranked = all
    .map(r => ({ ...r, computed: finalRating(r) }))
    .filter(r => typeof r.computed === 'number')
    .sort((a, b) => b.computed - a.computed)
    .map((r, i) => ({
      albumId: r.albumId,
      rank: i + 1,
      rating: r.computed,
      album: { name: r.albumName, artists: [r.artist].filter(Boolean), cover: r.cover }
    }))

  const n = ranked.length
  const me = ranked.find(r => r.albumId === String(albumId))
  const r = me?.rank || 1

  // Top three, then a window around this album, with a marker where ranks skip.
  let lo = r - 1, hi = r + 1
  if (r <= 1) { lo = 1; hi = 3 }
  if (r >= n) { lo = n - 2; hi = n }
  const want = new Set([1, 2, 3].filter(k => k <= n))
  for (let i = Math.max(1, lo); i <= Math.min(n, hi); i++) want.add(i)
  const ladder = []
  let prev = 0
  for (const k of [...want].sort((a, b) => a - b)) {
    if (prev && k - prev > 1) ladder.push({ gap: true })
    ladder.push(ranked[k - 1])
    prev = k
  }
  for (const e of ladder) if (!e.gap) e.coverProxied = await embed(e.album.cover)

  // The discography is what you rated by this artist, plus anything you typed
  // in by hand, so a slide can show a whole catalogue rather than only the
  // parts that happen to have a score.
  const artistName = snapshot.artists?.[0] || 'Unknown'
  const lower = artistName.toLowerCase()

  const rated = ranked
    .filter(x => x.album.artists?.[0]?.toLowerCase() === lower)
    .map(x => ({
      key: x.albumId,          // DiscoCell keys its list on this
      name: x.album.name,
      // The discography cell prints "year · #rank" for a rated album. Without
      // the year it printed the rank alone, which read as the year never having
      // imported when it was simply never passed through here.
      year: x.album.year,
      cover: x.album.cover,
      rated: true,
      rating: x.rating,
      rank: x.rank
    }))

  // Titles are compared loosely so "Album (Deluxe Edition)" does not appear
  // twice next to the copy you actually rated.
  const norm = t => (t || '').toLowerCase().trim().replace(/\s*[\(\[].*$/, '')
  const taken = new Set(rated.map(a => norm(a.name)))

  const manual = (await listDiscography(email))
    .filter(e => (e.artists || []).some(a => a.toLowerCase() === lower))
    .filter(e => !taken.has(norm(e.name)))
    .map(e => {
      taken.add(norm(e.name))
      return { key: e.id, name: e.name, cover: e.cover, year: e.year, rated: false, source: 'manual' }
    })

  // Everything else the artist released, straight from the catalogue, so the
  // slide shows a whole discography without anyone typing it in.
  // Anything hidden on the discography screen stays off the slide. The
  // catalogue types plenty of singles and one-off EPs as albums, and those
  // never touch the database, so this list is the only place they can be
  // turned off.
  const hidden = new Set(normalisePreferences(await getPreferences(email)).hiddenAlbums)

  // Hidden albums are marked rather than dropped. Dropping them meant the
  // export screen could take one off but had nothing left to put back, because
  // the entry no longer existed in what the server sent. Everything that
  // renders these frames filters on the same list.
  const auto = opts.autoDiscography === false ? [] : (await discographyByName(artistName))
    .filter(a => !taken.has(norm(a.name)))
    .map(a => {
      taken.add(norm(a.name))
      return {
        key: `auto:${a.id}`, name: a.name, cover: a.cover, year: a.year,
        rated: false, source: 'auto',
        hidden: hidden.has(albumKey(artistName, a.name))
      }
    })

  const albums = [...rated, ...manual, ...auto]
  const discographies = albums.length
    ? [{
        artist: artistName,
        albums: await Promise.all(albums.map(async a => ({ ...a, cover: await embed(a.cover) })))
      }]
    : []

  const coverProxied = await embed(snapshot.cover)

  return {
    review: {
      albumId: String(albumId),
      album: { ...snapshot, coverProxied },
      ratings: mine.scores || {},
      criteria: mine.criteria || {},
      selections: mine.selections || {},
      nowPlaying: mine.nowPlaying || null,
      finalOverride: mine.finalOverride,
      artistImages: mine.artistImages || [],
      // Blocks this review's slides were told to leave out.
      hiddenParts: mine.hiddenParts || []
    },
    // The same list the discography screen writes, so the X on a cover here and
    // the X on a row there are two ways into one decision rather than two
    // lists that can disagree.
    hiddenAlbums: [...hidden],
    // The account's saved looks, so the export screen can offer them without a
    // second round trip on load.
    looks: normalisePreferences(await getPreferences(email)).looks,
    albumNumber: all.length
      ? [...all].sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''))
          .findIndex(x => x.albumId === String(albumId)) + 1
      : 1,
    songAverage: songAverage(mine.scores),
    parts: ratingParts(mine),
    final: finalRating(mine),
    rank: me?.rank || null,
    totalRanked: n,
    ladder,
    discographies,
    tierLabels: TIER_LABELS,
    maxScore: MAX_SCORE
  }
}
