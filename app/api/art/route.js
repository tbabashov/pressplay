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

export async function GET (req) {
  const raw = new URL(req.url).searchParams.get('u')
  if (!raw) return new Response('missing url', { status: 400 })

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
