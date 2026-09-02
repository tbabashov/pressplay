// Catalogue lookups. One source gives artwork, real tracklists, running times and
// a thirty second preview per track, which is exactly what rating an album needs.

import { creditsFrom } from './credits.js'

const API = 'https://api.deezer.com'

const j = async url => {
  const r = await fetch(url, { next: { revalidate: 3600 } })
  if (!r.ok) throw new Error(`lookup failed (${r.status})`)
  const body = await r.json()
  if (body?.error) throw new Error(body.error.message || 'lookup failed')
  return body
}

const yearOf = d => (d && /^\d{4}/.test(d) ? d.slice(0, 4) : null)

export async function searchAlbums (query, limit = 24) {
  const q = (query || '').trim()
  if (q.length < 2) return []
  const body = await j(`${API}/search/album?q=${encodeURIComponent(q)}&limit=${limit}`)
  const seen = new Set()
  return (body.data || [])
    .filter(a => {
      const k = `${a.artist?.name}|${a.title}`.toLowerCase()
      if (seen.has(k)) return false
      seen.add(k)
      return true
    })
    .map(a => ({
      id: String(a.id),
      name: a.title,
      artist: a.artist?.name || 'Unknown',
      artistId: a.artist?.id ? String(a.artist.id) : null,
      cover: a.cover_xl || a.cover_big || a.cover_medium || null,
      tracks: a.nb_tracks || null
    }))
}

export async function getAlbum (id) {
  const a = await j(`${API}/album/${id}`)
  const tracks = (a.tracks?.data || []).map((t, i) => {
    // The contributors list is usually empty on a tracklist response, and the
    // short title strips "(feat. X)" but leaves "(with X)", so the credit ends
    // up inside the name. Take it from whichever place it turns out to be in.
    const raw = t.title_short || t.title
    const parsed = creditsFrom(raw)
    const contributors = (t.contributors || [])
      .map(c => c.name)
      .filter(n => n && n !== a.artist?.name)
    const seen = new Set()
    return {
      id: String(t.id),
      n: i + 1,
      title: parsed.title || raw,
      duration: t.duration || 0,
      preview: !!t.preview,
      features: [...contributors, ...parsed.features].filter(n => {
        const k = n.toLowerCase()
        if (seen.has(k)) return false
        seen.add(k)
        return true
      })
    }
  })
  // Everyone credited as a main artist, not just the one the catalogue happens
  // to file the record under. Bandana and Pinata are Freddie Gibbs and Madlib;
  // listing one of them is the record credited wrongly, not abbreviated.
  const mains = (a.contributors || [])
    .filter(c => (c.role || '').toLowerCase() === 'main')
    .map(c => c.name)
    .filter(Boolean)
  const artists = [...new Set([a.artist?.name, ...mains].filter(Boolean))]

  return {
    id: String(a.id),
    name: a.title,
    artist: a.artist?.name || 'Unknown',
    artists: artists.length ? artists : [a.artist?.name || 'Unknown'],
    artistId: a.artist?.id ? String(a.artist.id) : null,
    cover: a.cover_xl || a.cover_big || null,
    year: yearOf(a.release_date),
    genre: a.genres?.data?.[0]?.name || null,
    label: a.label || null,
    runtime: a.duration || tracks.reduce((s, t) => s + t.duration, 0),
    tracks
  }
}

export async function getDiscography (artistId, limit = 60) {
  if (!artistId) return []
  const body = await j(`${API}/artist/${artistId}/albums?limit=${limit}`)
  return (body.data || [])
    .filter(a => a.record_type === 'album')
    .map(a => ({
      id: String(a.id),
      name: a.title,
      cover: a.cover_big || a.cover_medium || null,
      year: yearOf(a.release_date)
    }))
}

export const fmtTime = s => {
  if (!s) return '—'
  const total = Math.round(s)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const sec = String(total % 60).padStart(2, '0')
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`
}

// Resolve an artist by name and return their studio albums, so a discography
// fills itself in instead of being typed by hand. Cached per process: a
// discography slide asks for the same artist on every render.
const artistCache = new Map()

// everything is what the discography screen asks for: singles and EPs as well
// as albums, because that screen is where you decide what belongs on a slide,
// and you cannot turn off something you were never shown. The slides themselves
// still ask for albums only by default.
export async function discographyByName (name, limit = 60, everything = false) {
  const key = (name || '').trim().toLowerCase()
  if (!key) return []
  const cacheKey = everything ? `all:${key}` : key
  if (artistCache.has(cacheKey)) return artistCache.get(cacheKey)

  try {
    const found = await j(`${API}/search/artist?q=${encodeURIComponent(name)}&limit=8`)
    // Exact name only. A fuzzy match here quietly attributes someone else's
    // catalogue to your artist, which is worse than showing nothing.
    // There are often several exact matches, and the empty duplicate can sort
    // first, so try them by following count until one actually has records.
    const candidates = (found.data || [])
      .filter(a => (a.name || '').trim().toLowerCase() === key)
      .sort((a, b) => (b.nb_fan || 0) - (a.nb_fan || 0))
    if (!candidates.length) { artistCache.set(cacheKey, []); return [] }

    let raw = []
    for (const c of candidates) {
      const body = await j(`${API}/artist/${c.id}/albums?limit=${everything ? 200 : limit}`)
      if (body.data?.length) { raw = body.data; break }
    }

    const seen = new Set()
    const albums = raw
      .filter(a => everything || a.record_type === 'album')
      .filter(a => {
        const k = (a.title || '').trim().toLowerCase().replace(/\s*[\(\[].*$/, '')
        if (!k || seen.has(k)) return false
        seen.add(k)
        return true
      })
      .map(a => ({
        id: String(a.id),
        name: a.title,
        cover: a.cover_big || a.cover_medium || null,
        year: yearOf(a.release_date),
        // album, single, ep or compile, straight from the catalogue, so the
        // screen can say what a record actually is rather than calling a
        // single an album.
        kind: a.record_type || 'album'
      }))
      .sort((a, b) => (b.year || '').localeCompare(a.year || ''))
    artistCache.set(cacheKey, albums)
    return albums
  } catch {
    artistCache.set(cacheKey, [])
    return []
  }
}
