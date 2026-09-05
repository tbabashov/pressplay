// Turns a saved review plus the rest of your library into the shape the export
// frames were written against. Covers come back as data URLs because the
// rasteriser draws through an SVG foreignObject, where remote images never load.
import { listReviews, listDiscography, getPreferences } from '../db/index.js'
import { getAlbum, discographyByName } from '../music.js'
import { NA, MAX_SCORE } from '../rating-scale.js'
import { artUrl } from '../../app/api/art/shared.js'
import { DEFAULT_CRITERIA, criterionValue, normalisePreferences, albumKey } from '../preferences.js'
import { resolveSelections } from '../auto-picks.js'
import { creditsInclude, albumTitleKey } from '../discography-match.js'

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

// The ceiling this review was actually scored against. A review saved before
// scales existed carries no model, and those were all given on the eleven the
// site started with — falling back to the current default instead would tell a
// long-standing eleven it was a ten.
export const scaleMax = review => Number(review?.scaleModel?.max) || MAX_SCORE

export function ratingParts (review) {
  const c = review.criteria || {}
  // Criteria were typed into an unclamped box for a long time, so a stored
  // value can sit outside the scale. Clamping on the way out keeps a slide
  // from printing a number the scale cannot express.
  const max = scaleMax(review)
  const clamp = v => Math.min(max, Math.max(0, v))
  return [
    { key: 'songAverage', label: 'Song Average', value: songAverage(review.scores), auto: true },
    ...(review.criteriaModel?.length ? review.criteriaModel : DEFAULT_CRITERIA)
      .map(({ key, label }) => {
      const v = criterionValue(c[key])
      return { key, label, value: v === null ? null : clamp(v), auto: false }
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
  // either, an old row, a partial save, an import that never carried one, 
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
      // The year has to travel with it. Without it the discography cell has
      // nothing to print for a record you actually rated, so every album you
      // had scored showed a rank and no year while the hand-typed ones beside
      // it showed theirs.
      album: {
        name: r.albumName,
        // Every main credit the review stored, not the single column the
        // library files it under. Rebuilding this from r.artist alone threw
        // the second name away before anything downstream could match on it,
        // which is what hid a collaboration from the other artist's
        // discography however carefully the matching was written.
        artists: (r.album?.artists?.length ? r.album.artists : [r.artist]).filter(Boolean),
        cover: r.cover,
        year: r.year || r.album?.year || null
      }
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

  // One discography per credit on the record, not one for the record.
  //
  // This read artists[0] and stopped, so a record by two people only ever grew
  // one catalogue: adding Drake to a PARTYNEXTDOOR album changed the credit
  // line on the slides and nothing else, because his name was never the one
  // being looked up. The frames have always drawn a group per artist; only
  // this half was single-minded.
  //
  // Capped, because each name costs a catalogue lookup and a stack of slides,
  // and a credit list longer than this is a compilation rather than a duo.
  const CREDIT_LIMIT = 4
  const credits = [...new Set((snapshot.artists || []).filter(Boolean))].slice(0, CREDIT_LIMIT)

  // Read once and shared: both are per account, not per artist.
  const hidden = new Set(normalisePreferences(await getPreferences(email)).hiddenAlbums)
  const typedIn = await listDiscography(email)

  const discographies = []
  for (const artistName of (credits.length ? credits : ['Unknown'])) {
    const lower = artistName.toLowerCase()

    // Every credit on the rated album, not only its first. A record made by two
    // people is filed by the catalogue under one of them, so comparing first to
    // first meant Scaring The Hoes belonged to JPEGMAFIA and nobody else: it was
    // never found as rated on Danny Brown's discography, and then came back from
    // the catalogue as an unrated question mark on a record he is on.
    const rated = ranked
      .filter(x => creditsInclude(x.album, artistName))
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
    // twice next to the copy you actually rated, and so a stray mark does not
    // split one record into two: uknowhatimsayin and uknowhatimsayin\u00bf are one
    // album typed two ways, and both were being listed.
    const norm = albumTitleKey
    const taken = new Set(rated.map(a => norm(a.name)))

    const manual = typedIn
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
    //
    // Hidden albums are marked rather than dropped. Dropping them meant the
    // export screen could take one off but had nothing left to put back, because
    // the entry no longer existed in what the server sent. Everything that
    // renders these frames filters on the same list.
    const auto = opts.autoDiscography === false ? [] : (await discographyByName(artistName).catch(() => []))
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
    if (albums.length) {
      discographies.push({
        artist: artistName,
        albums: await Promise.all(albums.map(async a => ({ ...a, cover: await embed(a.cover) })))
      })
    }
  }

  const coverProxied = await embed(snapshot.cover)

  return {
    review: {
      albumId: String(albumId),
      album: { ...snapshot, coverProxied },
      ratings: mine.scores || {},
      criteria: mine.criteria || {},
      // Resolved, not raw. Best song and worst song fill themselves in from
      // the scores when nothing was picked, and every block that draws a
      // superlative checks for a value first, so unresolved meant the best
      // song block never appeared for anyone who left it on automatic.
      selections: resolveSelections(mine.selections, mine.scores, snapshot.tracks),
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
    maxScore: scaleMax(mine)
  }
}
