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

// What an artwork host is allowed to answer with. Covers are jpeg or png in
// practice; the rest are here because a CDN may re-encode and it would be
// wrong to break a cover over a format that is plainly still an image.
const IMAGE_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'
])

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

  // The type is clamped rather than passed through. This route answers on this
  // origin, so whatever it returns is same-origin: a host on the list above
  // that answered 200 with an HTML error page would otherwise have that page
  // served as a document from here, which is the one way an image proxy turns
  // into a scripting hole. Anything that is not an image is refused outright,
  // and the header is rebuilt from the allowlist rather than echoed, so no
  // parameter travels with it.
  const type = (r.headers.get('content-type') || '').split(';')[0].trim().toLowerCase()
  if (!IMAGE_TYPES.has(type)) return new Response('not an image', { status: 502 })

  return new Response(r.body, {
    headers: {
      'content-type': type,
      // Belt and braces: the global nosniff header says this too, and it costs
      // nothing to say it on the one response that carries foreign bytes.
      'x-content-type-options': 'nosniff',
      'cache-control': 'public, max-age=86400, immutable'
    }
  })
}
