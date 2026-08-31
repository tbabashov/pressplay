// Catalogue lookups. One source gives artwork, real tracklists, running times and
// a thirty second preview per track, which is exactly what rating an album needs.

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
  const tracks = (a.tracks?.data || []).map((t, i) => ({
    id: String(t.id),
    n: i + 1,
    title: t.title_short || t.title,
    duration: t.duration || 0,
    preview: !!t.preview,
    // Everyone credited past the lead artist becomes the feature line.
    features: (t.contributors || [])
      .map(c => c.name)
      .filter(n => n && n !== a.artist?.name)
  }))
  return {
    id: String(a.id),
    name: a.title,
    artist: a.artist?.name || 'Unknown',
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
  const m = Math.floor(s / 60)
  return `${m}:${String(Math.round(s % 60)).padStart(2, '0')}`
}
