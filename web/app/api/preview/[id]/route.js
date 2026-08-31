// Deezer hands out signed preview URLs that expire within days, so we resolve
// the track fresh on each request and stream it from our own origin. Same-origin
// audio is also what lets the player run it through an AnalyserNode.
const memo = new Map()
const TTL = 1000 * 60 * 30

export async function GET(_req, { params }) {
  const { id } = await params
  if (!/^\d+$/.test(id)) return new Response('bad id', { status: 400 })

  let url = memo.get(id)
  if (!url || url.at < Date.now() - TTL) {
    const r = await fetch(`https://api.deezer.com/track/${id}`)
    if (!r.ok) return new Response('lookup failed', { status: 502 })
    const t = await r.json()
    if (!t.preview) return new Response('no preview', { status: 404 })
    url = { href: t.preview, at: Date.now() }
    memo.set(id, url)
  }

  const audio = await fetch(url.href)
  if (!audio.ok) { memo.delete(id); return new Response('fetch failed', { status: 502 }) }

  // Forward the length and range support, otherwise the element never learns a
  // duration and progress/seeking silently do nothing.
  const headers = {
    'content-type': 'audio/mpeg',
    'cache-control': 'public, max-age=1800',
    'accept-ranges': 'bytes',
  }
  const len = audio.headers.get('content-length')
  if (len) headers['content-length'] = len

  return new Response(audio.body, { headers })
}
