import 'dotenv/config'
import express from 'express'
import crypto from 'crypto'
import path from 'path'
import { fileURLToPath } from 'url'
import { store } from './store.js'
import { finalRating, songAverage, ratingParts, isRated } from '../src/rating.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
app.use(express.json({ limit: '20mb' })) // custom covers are stored as data URLs

const PORT = process.env.PORT || 3001
const PASSWORD = process.env.APP_PASSWORD || 'changeme'
const SPOTIFY_ID = process.env.SPOTIFY_CLIENT_ID
const SPOTIFY_SECRET = process.env.SPOTIFY_CLIENT_SECRET

// ---------- Spotify client-credentials token ----------
let spotifyToken = null
let spotifyTokenExpires = 0

async function getSpotifyToken () {
  if (!SPOTIFY_ID || !SPOTIFY_SECRET) {
    const err = new Error('Spotify keys missing. Add SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET to .env and restart.')
    err.status = 503
    throw err
  }
  if (spotifyToken && Date.now() < spotifyTokenExpires - 60_000) return spotifyToken
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${SPOTIFY_ID}:${SPOTIFY_SECRET}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  })
  if (!res.ok) {
    const err = new Error('Spotify auth failed — check your client ID/secret in .env')
    err.status = 502
    throw err
  }
  const data = await res.json()
  spotifyToken = data.access_token
  spotifyTokenExpires = Date.now() + data.expires_in * 1000
  return spotifyToken
}

async function spotify (endpoint) {
  const token = await getSpotifyToken()
  const res = await fetch(`https://api.spotify.com/v1${endpoint}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  if (!res.ok) {
    const err = new Error(`Spotify API error (${res.status})`)
    err.status = res.status
    throw err
  }
  return res.json()
}

// ---------- iTunes fallback (no keys required) ----------
function upscaleArt (url, size) {
  return url ? url.replace(/\d+x\d+bb\.jpg$/, `${size}x${size}bb.jpg`) : null
}

const ARTIST_SEP = /,|&(?!amp)|\band\b|feat\.?\s|ft\.?\s|featuring\s/i

// Artist names that legitimately contain a separator (comma / "and" / "&") and
// must never be split into multiple artists. Matched case-insensitively against
// the whole trimmed credit.
const UNITARY_NAMES = new Set([
  'tyler, the creator',
  'earth, wind & fire',
  'crosby, stills & nash',
  'crosby, stills, nash & young',
  'blood, sweat & tears',
  'emerson, lake & palmer',
  'peter, paul and mary',
  'hootie & the blowfish',
  'florence and the machine',
  'florence + the machine',
  'echo & the bunnymen',
  'derek and the dominos'
])

// Individual names inside a credit string: "Danger Mouse & Black Thought" -> both names
function splitNames (s) {
  if (UNITARY_NAMES.has(s.trim().toLowerCase())) return [s.trim()]
  return s.split(ARTIST_SEP).map(x => x.trim()).filter(Boolean)
}

// Heal an artists array where a unitary name was wrongly split across elements,
// e.g. ["Tyler","The Creator"] -> ["Tyler, The Creator"]. Greedily merges the
// longest adjacent run that joins to a known unitary name; leaves genuine
// multi-artist arrays (["Drake","Future"]) untouched.
function normalizeArtists (arr) {
  if (!Array.isArray(arr)) return arr
  const out = []
  for (let i = 0; i < arr.length;) {
    let matched = false
    for (let j = arr.length; j > i + 1; j--) {
      const joined = arr.slice(i, j).map(x => String(x).trim()).join(', ')
      if (UNITARY_NAMES.has(joined.toLowerCase())) {
        out.push(joined)
        i = j
        matched = true
        break
      }
    }
    if (!matched) { out.push(arr[i]); i++ }
  }
  return out
}

function parseFeatures (trackName, artistName, primaryArtists) {
  // Every name that counts as "the album's own artist(s)", in all orderings
  const primary = new Set()
  for (const p of primaryArtists) {
    primary.add(p.toLowerCase())
    splitNames(p).forEach(n => primary.add(n.toLowerCase()))
  }
  const feats = new Set()
  const add = n => { if (!primary.has(n.toLowerCase())) feats.add(n) }
  const m = trackName.match(/[([](?:feat\.?|ft\.?|featuring)\s+([^)\]]+)[)\]]/i)
  if (m) splitNames(m[1]).forEach(add)
  splitNames(artistName).forEach(add)
  return [...feats]
}

// "Belize (feat. MF DOOM)" -> "Belize" — features are rendered separately
function cleanTrackName (name) {
  return name.replace(/\s*[([](?:feat\.?|ft\.?|featuring)\s+[^)\]]*[)\]]/ig, '').trim()
}

async function itunesSearch (q) {
  const res = await fetch(`https://itunes.apple.com/search?media=music&entity=album&limit=20&term=${encodeURIComponent(q)}`)
  if (!res.ok) throw new Error('iTunes search failed')
  const data = await res.json()
  return data.results.map(a => ({
    id: String(a.collectionId),
    name: a.collectionName,
    artists: [a.artistName],
    releaseDate: a.releaseDate?.slice(0, 10),
    genre: a.primaryGenreName || null,
    totalTracks: a.trackCount,
    cover: upscaleArt(a.artworkUrl100, 1200),
    coverSmall: a.artworkUrl100
  }))
}

async function itunesAlbum (id) {
  const res = await fetch(`https://itunes.apple.com/lookup?id=${id}&entity=song&limit=200`)
  if (!res.ok) throw new Error('iTunes lookup failed')
  const data = await res.json()
  const coll = data.results.find(r => r.wrapperType === 'collection')
  if (!coll) { const e = new Error('Album not found'); e.status = 404; throw e }
  const primaryArtists = [coll.artistName]
  const tracks = data.results.filter(r => r.wrapperType === 'track')
  return {
    id: String(coll.collectionId),
    name: coll.collectionName,
    artists: primaryArtists,
    releaseDate: coll.releaseDate?.slice(0, 10),
    year: coll.releaseDate?.slice(0, 4),
    genre: coll.primaryGenreName || null,
    cover: upscaleArt(coll.artworkUrl100, 1200),
    coverSmall: coll.artworkUrl100,
    tracks: tracks.map(t => ({
      id: String(t.trackId),
      name: cleanTrackName(t.trackName || ''),
      durationMs: t.trackTimeMillis || 0,
      trackNumber: t.trackNumber,
      discNumber: t.discNumber,
      artists: [t.artistName],
      features: parseFeatures(t.trackName || '', t.artistName || '', primaryArtists)
    }))
  }
}

// ---------- Discogs (optional, needs a free personal token) ----------
const DISCOGS_TOKEN = process.env.DISCOGS_TOKEN

async function discogs (endpoint) {
  if (!DISCOGS_TOKEN) {
    const e = new Error('Discogs token missing'); e.status = 503; throw e
  }
  const sep = endpoint.includes('?') ? '&' : '?'
  const res = await fetch(`https://api.discogs.com${endpoint}${sep}token=${DISCOGS_TOKEN}`, {
    headers: { 'User-Agent': 'AlbumRankings/1.0' }
  })
  if (!res.ok) {
    const e = new Error(`Discogs API error (${res.status})`); e.status = res.status; throw e
  }
  return res.json()
}

// Discogs disambiguates duplicate names as "Artist (2)" — strip that
const cleanDiscogsName = n => (n || '').replace(/\s*\(\d+\)/g, '').trim()

function discogsDurationMs (d) {
  const parts = (d || '').split(':').map(Number)
  if (parts.some(isNaN) || parts.length === 0) return 0
  return parts.reduce((a, b) => a * 60 + b, 0) * 1000
}

async function discogsSearch (q) {
  const data = await discogs(`/database/search?type=master&format=album&per_page=15&q=${encodeURIComponent(q)}`)
  return (data.results || []).map(r => {
    // Title format is "Artist - Title", but the artist credit itself may
    // contain " - " (e.g. "Doom And Madlib - Madvillain") — split on the last one
    const t = r.title || ''
    const cut = t.lastIndexOf(' - ')
    const artistPart = cut > 0 ? t.slice(0, cut) : ''
    const namePart = cut > 0 ? t.slice(cut + 3) : t
    // Member credits may prefix the group name ("Doom And Madlib - Madvillain"):
    // the segment closest to the title is the actual artist
    const artist = cleanDiscogsName(artistPart.split(' - ').pop() || '').replace(/\*/g, '').trim()
    return {
      id: `dg:${r.id}`,
      name: cleanDiscogsName(namePart),
      artists: [artist || 'Unknown'],
      releaseDate: r.year ? String(r.year) : null,
      genre: r.genre?.[0] || null,
      totalTracks: null,
      cover: r.cover_image || null,
      coverSmall: r.thumb || r.cover_image || null
    }
  })
}

async function discogsAlbum (masterId) {
  const master = await discogs(`/masters/${masterId}`)
  const rel = master.main_release ? await discogs(`/releases/${master.main_release}`) : master
  const primaryArtists = (rel.artists || master.artists || []).map(a => cleanDiscogsName(a.name))
  const tracks = (rel.tracklist || master.tracklist || []).filter(t => !t.type_ || t.type_ === 'track')
  return {
    id: `dg:${masterId}`,
    name: rel.title || master.title,
    artists: primaryArtists,
    releaseDate: String(rel.year || master.year || ''),
    year: String(rel.year || master.year || ''),
    genre: (rel.genres || master.genres || [])[0] || null,
    cover: (rel.images || master.images || [])[0]?.uri || null,
    coverSmall: (rel.images || master.images || [])[0]?.uri150 || null,
    tracks: tracks.map((t, i) => {
      const feats = new Set(
        (t.extraartists || []).filter(a => /feat/i.test(a.role || '')).map(a => cleanDiscogsName(a.name))
      )
      parseFeatures(t.title || '', '', primaryArtists).forEach(f => feats.add(f))
      return {
        id: `dg:${masterId}:${i}`,
        name: cleanTrackName(t.title || ''),
        durationMs: discogsDurationMs(t.duration),
        trackNumber: i + 1,
        discNumber: 1,
        artists: primaryArtists,
        features: [...feats]
      }
    })
  }
}

// ---------- Auth ----------
app.post('/api/login', (req, res) => {
  if (req.body?.password === PASSWORD) {
    const token = crypto.randomBytes(32).toString('hex')
    store.addSession(token)
    res.json({ token })
  } else {
    res.status(401).json({ error: 'Wrong password' })
  }
})

app.use('/api', (req, res, next) => {
  // /img is exempt: <img> tags can't send auth headers, and it only proxies album art CDNs
  if (req.path === '/login' || req.path === '/img') return next()
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (token && store.hasSession(token)) return next()
  res.status(401).json({ error: 'Unauthorized' })
})

// ---------- Spotify endpoints ----------
async function spotifySearch (q) {
  const data = await spotify(`/search?type=album&limit=20&q=${encodeURIComponent(q)}`)
  return data.albums.items.map(a => ({
    id: a.id,
    name: a.name,
    artists: a.artists.map(x => x.name),
    releaseDate: a.release_date,
    totalTracks: a.total_tracks,
    cover: a.images[0]?.url || null,
    coverSmall: a.images[a.images.length - 1]?.url || null
  }))
}

// Key for de-duplicating the same album across sources
const dedupeKey = a => (a.artists.join(' ') + ' ' + a.name)
  .toLowerCase()
  .replace(/[([].*?[)\]]/g, '')
  .replace(/deluxe|expanded|remaster(ed)?|edition|version/g, '')
  .replace(/[^a-z0-9]/g, '')

app.get('/api/search', async (req, res, next) => {
  try {
    const q = String(req.query.q || '').trim()
    const source = String(req.query.source || 'all')
    if (!q) return res.json({ albums: [] })

    if (source === 'itunes') return res.json({ albums: await itunesSearch(q) })
    if (source === 'discogs') return res.json({ albums: await discogsSearch(q) })
    if (source === 'spotify') return res.json({ albums: await spotifySearch(q) })

    // 'all': query every available source in parallel and merge (stores first, Discogs fills gaps)
    const [sp, it, dg] = await Promise.allSettled([
      spotifySearch(q),
      itunesSearch(q),
      DISCOGS_TOKEN ? discogsSearch(q) : Promise.resolve([])
    ])
    const merged = []
    const seen = new Set()
    for (const list of [sp, it, dg]) {
      if (list.status !== 'fulfilled') continue
      for (const a of list.value) {
        const key = dedupeKey(a)
        if (seen.has(key)) continue
        seen.add(key)
        merged.push(a)
      }
    }
    res.json({ albums: merged.slice(0, 30) })
  } catch (e) { next(e) }
})

app.get('/api/album/:id', async (req, res, next) => {
  try {
    // "manual:" = user-created album, stored inside its review
    if (req.params.id.startsWith('manual:')) {
      const r = store.getReview(req.params.id)
      if (!r) return res.status(404).json({ error: 'Manual album not found' })
      return res.json(r.album)
    }
    // "dg:" prefix = Discogs master; numeric = iTunes collection; base62 string = Spotify
    if (req.params.id.startsWith('dg:')) {
      return res.json(await discogsAlbum(req.params.id.slice(3)))
    }
    if (/^\d+$/.test(req.params.id)) {
      return res.json(await itunesAlbum(req.params.id))
    }
    const a = await spotify(`/albums/${req.params.id}`)
    let tracks = a.tracks.items
    let nextUrl = a.tracks.next
    while (nextUrl) {
      const more = await spotify(nextUrl.replace('https://api.spotify.com/v1', ''))
      tracks = tracks.concat(more.items)
      nextUrl = more.next
    }
    const primaryArtists = a.artists.map(x => x.name)
    res.json({
      id: a.id,
      name: a.name,
      artists: primaryArtists,
      releaseDate: a.release_date,
      year: a.release_date?.slice(0, 4),
      genre: a.genres?.[0] || null,
      cover: a.images[0]?.url || null,
      coverSmall: a.images[a.images.length - 1]?.url || null,
      tracks: tracks.map(t => ({
        id: t.id,
        name: t.name,
        durationMs: t.duration_ms,
        trackNumber: t.track_number,
        discNumber: t.disc_number,
        artists: t.artists.map(x => x.name),
        features: t.artists.map(x => x.name).filter(n => !primaryArtists.includes(n))
      }))
    })
  } catch (e) { next(e) }
})

// Image proxy so canvas export isn't blocked by CORS. Covers are held in
// memory because the export screens inline every one of them as a data URL on
// each load — the leaderboard video alone asks for 140 at once.
const imgCache = new Map()
const IMG_CACHE_MAX = 400

app.get('/api/img', async (req, res) => {
  try {
    const url = String(req.query.url || '')
    if (!/^https:\/\/(i\.scdn\.co|image-cdn[\w.-]*\.spotifycdn\.com|[\w.-]+\.scdn\.co|[\w.-]+\.mzstatic\.com|[\w.-]+\.discogs\.com)\//.test(url)) {
      return res.status(400).send('Bad url')
    }
    const send = hit => {
      res.set('Content-Type', hit.type)
      res.set('Cache-Control', 'public, max-age=86400')
      res.send(hit.body)
    }
    const cached = imgCache.get(url)
    if (cached) return send(cached)

    const r = await fetch(url)
    if (!r.ok) return res.status(502).send('Fetch failed')
    const hit = {
      type: r.headers.get('content-type') || 'image/jpeg',
      body: Buffer.from(await r.arrayBuffer())
    }
    if (imgCache.size >= IMG_CACHE_MAX) imgCache.delete(imgCache.keys().next().value)
    imgCache.set(url, hit)
    send(hit)
  } catch {
    res.status(500).send('Proxy error')
  }
})

// ---------- Reviews ----------

// Every rated album, best first — the single source of rank used by the export
// frames, the leaderboard video and the home list.
function rankedAlbums () {
  const ranked = store.db.reviews
    .filter(isRated)
    .map(r => ({
      albumId: r.albumId,
      album: r.album,
      rating: finalRating(r),
      songAverage: songAverage(r),
      createdAt: r.createdAt
    }))
    .sort((a, b) => b.rating - a.rating)
  ranked.forEach((r, i) => { r.rank = i + 1 })
  return ranked
}

// "Album #141" on the title card: how many albums had been started before this
// one, in the order they were first saved. A typed albumNumber wins.
function albumNumber (review) {
  if (typeof review.albumNumber === 'number') return review.albumNumber
  const order = [...store.db.reviews].sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt)))
  const i = order.findIndex(r => r.albumId === review.albumId)
  return i >= 0 ? i + 1 : order.length + 1
}

app.get('/api/reviews', (req, res) => {
  // Unrated reviews (e.g. a manual album created but not yet rated) are kept
  // in the list so they can be resumed, but get no rank or rating
  const reviews = store.db.reviews.map(r => ({
    albumId: r.albumId,
    album: r.album,
    average: isRated(r) ? finalRating(r) : null,
    songAverage: isRated(r) ? songAverage(r) : null,
    hasCriteria: ratingParts(r).some(p => !p.auto && p.value !== null),
    createdAt: r.createdAt,
    updatedAt: r.updatedAt
  })).sort((a, b) => (b.average ?? -1) - (a.average ?? -1))
  let rank = 1
  reviews.forEach(r => { r.rank = r.average != null ? rank++ : null })
  res.json({ reviews })
})

app.get('/api/reviews/:albumId', (req, res) => {
  const r = store.getReview(req.params.albumId)
  if (!r) return res.status(404).json({ error: 'Not found' })
  res.json(r)
})

app.put('/api/reviews/:albumId', (req, res) => {
  const { album, ratings, selections, thoughts, titleOverrides, featureOverrides, runtimeOverrideMs, genreOverride, paletteColor, coverOverride, artistsOverride, nameOverride, yearOverride, orderOverride, removedTracks, extraTracks, criteria, finalOverride, nowPlaying, albumNumber, artistImages } = req.body
  if (!album || !ratings) return res.status(400).json({ error: 'album and ratings required' })
  if (album.artists) album.artists = normalizeArtists(album.artists)
  if (Array.isArray(album.tracks)) {
    for (const t of album.tracks) if (t.artists) t.artists = normalizeArtists(t.artists)
  }
  const review = store.upsertReview({
    albumId: req.params.albumId,
    album, ratings,
    criteria: criteria || {},
    finalOverride: typeof finalOverride === 'number' ? finalOverride : null,
    nowPlaying: nowPlaying || null,
    albumNumber: typeof albumNumber === 'number' ? albumNumber : null,
    artistImages: artistImages || [],
    selections: selections || {},
    thoughts: thoughts || '',
    titleOverrides: titleOverrides || {},
    featureOverrides: featureOverrides || {},
    runtimeOverrideMs: runtimeOverrideMs || null,
    genreOverride: genreOverride || null,
    paletteColor: paletteColor || null,
    coverOverride: coverOverride || null,
    artistsOverride: artistsOverride || null,
    nameOverride: nameOverride || null,
    yearOverride: yearOverride || null,
    orderOverride: orderOverride || null,
    removedTracks: removedTracks || [],
    extraTracks: extraTracks || []
  })
  res.json(review)
})

app.delete('/api/reviews/:albumId', (req, res) => {
  store.deleteReview(req.params.albumId)
  res.json({ ok: true })
})

// Match on individual artists, not whole credit strings — "Larry June &
// The Alchemist" must match "Freddie Gibbs & The Alchemist" via The Alchemist
function nameSet (arts) {
  const s = new Set()
  for (const a of arts || []) {
    s.add(a.toLowerCase())
    splitNames(a).forEach(n => s.add(n.toLowerCase()))
  }
  return s
}

// Every individually credited artist on an album, in credit order.
function creditedNames (artists) {
  const out = []
  for (const credit of artists || []) {
    const parts = splitNames(credit)
    for (const n of (parts.length > 1 ? parts : [credit])) {
      if (!out.some(x => x.toLowerCase() === n.toLowerCase())) out.push(n)
    }
  }
  return out
}

// Every artist a hand-entered album counts towards: the one whose list it was
// typed into, plus everyone named on its credit line.
const entryCredits = e => nameSet([e.artist, ...(e.artists || [])].filter(Boolean))

// One artist's full discography: every album of theirs that's been rated, plus
// the hand-entered records for the ones that haven't. Nothing is ever fetched
// from iTunes or Discogs here — the frames only show what's been vouched for.
function discographyFor (name, ranked) {
  const ln = name.toLowerCase()
  const rated = ranked
    .filter(r => nameSet(r.album.artists).has(ln))
    .map(r => ({
      key: r.albumId,
      name: r.album.name,
      artists: r.album.artists,
      year: r.album.year || null,
      cover: r.album.coverSmall || r.album.cover,
      rating: r.rating,
      rank: r.rank,
      rated: true
    }))
  // A hand-entered album that later gets rated would otherwise show up twice
  const seen = new Set(rated.map(a => a.name.toLowerCase().trim()))
  // Filed under one artist, but it counts for everyone on the credit line —
  // enter a collab once and it appears in each of their discographies, exactly
  // as a rated album already does.
  const pending = store.getDiscography()
    .filter(e => entryCredits(e).has(ln) && !seen.has((e.name || '').toLowerCase().trim()))
    .map(e => ({
      key: e.id,
      name: e.name,
      artists: e.artists?.length ? e.artists : [e.artist],
      year: e.year || null,
      cover: e.cover || null,
      rating: null,
      rank: null,
      rated: false,
      owner: e.artist // whose list it was typed into; edits reach all of them
    }))
  return [...rated, ...pending].sort((a, b) => (Number(a.year) || 9999) - (Number(b.year) || 9999))
}

// Everything the export screen needs: this review + full ranking + discographies
app.get('/api/export/:albumId', (req, res) => {
  const review = store.getReview(req.params.albumId)
  if (!review) return res.status(404).json({ error: 'Not found' })

  const ranked = rankedAlbums()
  const me = ranked.find(r => r.albumId === review.albumId)

  // F1-style ladder: always the top 3, then a window around this album
  // (expanded at the edges), with a gap marker where ranks are skipped
  const n = ranked.length
  const r = me?.rank || 1
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

  // One discography frame per credited artist — never two artists on one image
  const discographies = creditedNames(review.album.artists)
    .map(name => ({ artist: name, albums: discographyFor(name, ranked) }))
    .filter(g => g.albums.length > 0)

  res.json({
    review,
    albumNumber: albumNumber(review),
    songAverage: songAverage(review),
    parts: ratingParts(review),
    final: finalRating(review),
    rank: me?.rank || null,
    totalRanked: ranked.length,
    ladder,
    discographies,
    tierLabels: store.getTierLabels()
  })
})

// ---------- Discography (manual entries) ----------
app.get('/api/discography', (req, res) => {
  // Artists worth offering in the picker: everyone credited on a rated album
  const ranked = rankedAlbums()
  const artists = new Map()
  for (const r of ranked) {
    for (const name of creditedNames(r.album.artists)) {
      const k = name.toLowerCase()
      if (!artists.has(k)) artists.set(k, { artist: name, ratedCount: 0 })
      artists.get(k).ratedCount++
    }
  }
  // credit a hand-entered album to everyone on it, so a collaborator who has
  // nothing rated still turns up in the picker
  for (const e of store.getDiscography()) {
    for (const name of creditedNames([e.artist, ...(e.artists || [])].filter(Boolean))) {
      const k = name.toLowerCase()
      if (!artists.has(k)) artists.set(k, { artist: name, ratedCount: 0 })
    }
  }
  res.json({
    entries: store.getDiscography(),
    artists: [...artists.values()].sort((a, b) => a.artist.localeCompare(b.artist))
  })
})

app.get('/api/discography/:artist', (req, res) => {
  const name = decodeURIComponent(req.params.artist)
  res.json({ artist: name, albums: discographyFor(name, rankedAlbums()) })
})

app.put('/api/discography/:id', (req, res) => {
  const { artist, name, artists, year, cover } = req.body || {}
  if (!artist || !name) return res.status(400).json({ error: 'artist and name required' })
  res.json(store.upsertDiscographyEntry({
    id: req.params.id,
    artist: String(artist).trim(),
    name: String(name).trim(),
    artists: Array.isArray(artists) && artists.length ? artists : [String(artist).trim()],
    year: year ? String(year).trim() : null,
    cover: cover || null
  }))
})

app.delete('/api/discography/:id', (req, res) => {
  store.deleteDiscographyEntry(req.params.id)
  res.json({ ok: true })
})

// ---------- Leaderboard snapshots & the update video ----------

// Freeze the leaderboard exactly as it stands, including every track score, so
// a later re-rank can be diffed against it.
function buildSnapshot (label) {
  return {
    id: `snap:${Date.now()}`,
    label: label || new Date().toISOString().slice(0, 10),
    createdAt: new Date().toISOString(),
    entries: rankedAlbums().map(r => {
      const review = store.getReview(r.albumId)
      const names = {}
      for (const t of review?.album?.tracks || []) names[t.id] = t.name
      return {
        albumId: r.albumId,
        name: r.album.name,
        artists: r.album.artists,
        rank: r.rank,
        rating: r.rating,
        tracks: Object.fromEntries(
          Object.entries(review?.ratings || {})
            .filter(([, v]) => typeof v === 'number')
            .map(([id, v]) => [id, { name: names[id] || '', rating: v }])
        )
      }
    })
  }
}

app.get('/api/snapshots', (req, res) => {
  res.json({
    snapshots: store.getSnapshots().map(s => ({
      id: s.id, label: s.label, createdAt: s.createdAt, count: s.entries.length
    }))
  })
})

app.post('/api/snapshots', (req, res) => {
  const snap = store.addSnapshot(buildSnapshot(req.body?.label))
  res.json({ id: snap.id, label: snap.label, createdAt: snap.createdAt, count: snap.entries.length })
})

app.delete('/api/snapshots/:id', (req, res) => {
  store.deleteSnapshot(req.params.id)
  res.json({ ok: true })
})

app.get('/api/update-notes', (req, res) => res.json({ notes: store.getUpdateNotes() }))
app.put('/api/update-notes', (req, res) => res.json({ notes: store.setUpdateNotes(req.body?.notes || []) }))

// The whole "leaderboard update" video: current standings diffed against a
// snapshot, plus the announcement bullets that open it.
app.get('/api/leaderboard-update', (req, res) => {
  const snapshots = store.getSnapshots()
  const base = req.query.snapshot
    ? snapshots.find(s => s.id === req.query.snapshot)
    : snapshots[snapshots.length - 1]

  const before = new Map((base?.entries || []).map(e => [e.albumId, e]))
  const rows = rankedAlbums().map(r => {
    const was = before.get(r.albumId)
    const review = store.getReview(r.albumId)

    // The track that gained the most since the snapshot — "from 7 to 10"
    let bestJump = null
    if (was) {
      for (const [id, v] of Object.entries(review?.ratings || {})) {
        const old = was.tracks?.[id]
        if (typeof v !== 'number' || !old || typeof old.rating !== 'number') continue
        const gain = v - old.rating
        if (gain > 0 && (!bestJump || gain > bestJump.gain)) {
          const track = review.album.tracks.find(t => t.id === id)
          bestJump = { name: track?.name || old.name || '', from: old.rating, to: v, gain }
        }
      }
    }

    return {
      albumId: r.albumId,
      album: r.album,
      rank: r.rank,
      rating: r.rating,
      prevRank: was?.rank ?? null,
      prevRating: was?.rating ?? null,
      rankDelta: was ? was.rank - r.rank : null, // positive = moved up
      ratingDelta: was ? r.rating - was.rating : null,
      isNew: !was,
      bestJump
    }
  })

  res.json({
    snapshot: base ? { id: base.id, label: base.label, createdAt: base.createdAt } : null,
    rows,
    notes: store.getUpdateNotes(),
    totalRanked: rows.length
  })
})

// ---------- Tier labels ----------
app.get('/api/tiers', (req, res) => res.json(store.getTierLabels()))
app.put('/api/tiers', (req, res) => res.json(store.setTierLabels(req.body || {})))

// ---------- Static (production) ----------
if (process.env.NODE_ENV === 'production') {
  const dist = path.join(__dirname, '..', 'dist')
  app.use(express.static(dist))
  app.get('*', (req, res) => res.sendFile(path.join(dist, 'index.html')))
}

app.use((err, req, res, next) => {
  res.status(err.status || 500).json({ error: err.message })
})

// The albums already in the database are the "before" side of the first update
// video, so freeze them the first time the server starts after the criteria
// system landed. Every re-rank from here on is measured against this baseline.
if (store.getSnapshots().length === 0 && store.db.reviews.length > 0) {
  const snap = store.addSnapshot(buildSnapshot('Before the criteria update'))
  console.log(`Baseline snapshot saved: ${snap.entries.length} albums`)
}

app.listen(PORT, () => console.log(`API running on http://localhost:${PORT}`))
