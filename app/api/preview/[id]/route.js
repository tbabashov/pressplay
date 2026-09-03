import { limit, callerKey } from '@/lib/rate-limit'

// Deezer hands out signed preview URLs that expire within days, so we resolve
// the track fresh on each request and stream it from our own origin. Same-origin
// audio is also what lets the player run it through an AnalyserNode.
const memo = new Map()
const TTL = 1000 * 60 * 30

const deezerPreview = async id => {
  const r = await fetch(`https://api.deezer.com/track/${id}`)
  if (!r.ok) return null
  const t = await r.json().catch(() => null)
  return t?.preview || null
}

// Apple serves this as text/javascript, so the body is parsed rather than
// assumed to be JSON. The preview url it hands back is a plain mp3 on its own
// CDN, which streams the same way Deezer's does.
const applePreview = async id => {
  const r = await fetch(`https://itunes.apple.com/lookup?id=${id}&entity=song`)
  if (!r.ok) return null
  const text = await r.text().catch(() => '')
  let body = null
  try { body = JSON.parse(text) } catch { return null }
  const row = (body?.results || []).find(x => x.wrapperType === 'track' && x.previewUrl)
  return row?.previewUrl || null
}

export async function GET(_req, { params }) {
  // Streaming audio to anyone who asks is this server's most expensive
  // unauthenticated act, so it is the one worth capping hardest.
  const stop = limit(callerKey(_req, 'preview'), { max: 60, windowMs: 60 * 1000 })
  if (stop) return stop

  const { id } = await params
  // A bare number is Deezer, the main catalogue. An am prefix is Apple, for the
  // records Deezer does not carry at all.
  if (!/^(am)?\d+$/.test(id)) return new Response('bad id', { status: 400 })

  let url = memo.get(id)
  if (!url || url.at < Date.now() - TTL) {
    const href = id.startsWith('am')
      ? await applePreview(id.slice(2))
      : await deezerPreview(id)
    if (!href) return new Response('no preview', { status: 404 })
    url = { href, at: Date.now() }
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
