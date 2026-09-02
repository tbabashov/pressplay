// Artwork proxy, so covers arrive same-origin and a canvas can read their colour
// without tainting. Locked to known artwork hosts: an open proxy here would let
// anyone use this server to fetch arbitrary URLs. It is a list rather than one
// host because imported reviews carry cover URLs from wherever they were
// originally rated.
const ALLOWED = [
  /(^|\.)dzcdn\.net$/,
  /(^|\.)mzstatic\.com$/,
  /(^|\.)scdn\.co$/,
  /(^|\.)discogs\.com$/
]

// base64url, so the whole target survives a single path segment: no slashes to
// be read as more segments, no padding to be stripped, no percent-encoding for
// a proxy or a CDN to normalise on the way through.
export const encodeArtKey = url =>
  Buffer.from(String(url), 'utf8').toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

// The link a page should use for a cover.
export const artUrl = url => `/api/art/${encodeArtKey(url)}`

export function decodeArtKey (key) {
  try {
    const b64 = String(key).replace(/-/g, '+').replace(/_/g, '/')
    const out = Buffer.from(b64, 'base64').toString('utf8')
    return out.startsWith('https://') ? out : null
  } catch { return null }
}

export async function fetchArt (raw) {
  let target
  try { target = new URL(raw) } catch { return new Response('bad url', { status: 400 }) }
  if (target.protocol !== 'https:' || !ALLOWED.some(re => re.test(target.hostname))) {
    return new Response('host not allowed', { status: 403 })
  }

  const r = await fetch(target, { next: { revalidate: 86400 } })
  if (!r.ok) return new Response('fetch failed', { status: 502 })

  return new Response(r.body, {
    headers: {
      'content-type': r.headers.get('content-type') || 'image/jpeg',
      'cache-control': 'public, max-age=86400, immutable'
    }
  })
}
