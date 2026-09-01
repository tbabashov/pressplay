// Data for the leaderboard slides. Covers are embedded because the rasteriser
// draws through an SVG foreignObject, where remote images never load.
import { listReviews, getSnapshot } from '../db/index.js'
import { rank, withDeltas } from '../standings.js'

const ROWS_PER_PAGE = 12

// Artwork is fetched once per process and reused: a board of a few hundred
// albums would otherwise refetch every cover on every visit.
const artCache = new Map()

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
      return `/api/art?u=${encodeURIComponent(url)}`
    }
  } catch { /* not a URL; fall through and inline it */ }
  return null   // the proxy will not serve it, so it has to be inlined
}

async function embed (url) {
  if (!url) return ''
  if (url.startsWith('data:')) return url
  const viaProxy = proxied(url)
  if (viaProxy) return viaProxy
  if (artCache.has(url)) return artCache.get(url)
  try {
    const r = await fetch(url, { cache: 'force-cache' })
    if (!r.ok) return ''
    const buf = Buffer.from(await r.arrayBuffer())
    const out = `data:${r.headers.get('content-type') || 'image/jpeg'};base64,${buf.toString('base64')}`
    artCache.set(url, out)
    return out
  } catch { return '' }
}

// Bounded concurrency: 165 sequential fetches took twenty-odd seconds, and
// firing all of them at once just trades that for connection errors.
async function mapLimit (items, limit, fn) {
  const out = new Array(items.length)
  let cursor = 0
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const i = cursor++
      out[i] = await fn(items[i], i)
    }
  })
  await Promise.all(workers)
  return out
}

export async function buildBoardExport (email) {
  const [reviews, snapshot] = await Promise.all([listReviews(email), getSnapshot(email)])
  const ranked = withDeltas(rank(reviews), snapshot)
  if (!ranked.length) return null

  const rows = ranked.map(r => ({
    albumId: r.albumId,
    rank: r.rank,
    rating: r.final,
    rankDelta: r.rankDelta,
    isNew: r.isNew,
    prevRank: snapshot?.ranks?.[r.albumId] ?? null,
    ratingDelta: snapshot?.ratings?.[r.albumId] !== undefined
      ? r.final - snapshot.ratings[r.albumId]
      : null,
    cover: r.cover,
    album: { name: r.albumName, artists: [r.artist].filter(Boolean) }
  }))

  const embedded = await mapLimit(rows, 12, r => embed(r.cover))
  rows.forEach((r, i) => { r.coverProxied = embedded[i] || '' })

  const pages = []
  for (let i = 0; i < rows.length; i += ROWS_PER_PAGE) {
    pages.push({ rows: rows.slice(i, i + ROWS_PER_PAGE), from: i + 1, to: Math.min(i + ROWS_PER_PAGE, rows.length) })
  }

  const moved = rows.filter(r => typeof r.rankDelta === 'number' && r.rankDelta !== 0)
  const climbers = moved.filter(r => r.rankDelta > 0).sort((a, b) => b.rankDelta - a.rankDelta).slice(0, 5)
  const fallers = moved.filter(r => r.rankDelta < 0).sort((a, b) => a.rankDelta - b.rankDelta).slice(0, 5)

  return {
    total: rows.length,
    top: rows.slice(0, 3),
    pages,
    climbers,
    fallers,
    hasSnapshot: !!snapshot,
    takenAt: snapshot?.takenAt || null
  }
}
