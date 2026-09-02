// A limiter that holds counts in memory.
//
// Worth being honest about what that means on Vercel: each serverless instance
// keeps its own counts, so someone spreading requests across instances gets
// more than the number says. It still stops the thing this is actually for,
// which is one script hammering one endpoint, because that script lands on a
// warm instance and gets refused. A limiter shared across instances needs
// somewhere shared to count in, and the honest options are a Redis or a
// database round trip on every request; neither is worth it at this size.
//
// The map is swept rather than left to grow, because an unbounded map in a
// long-lived process is a memory leak with a slow fuse.

const buckets = new Map()
let lastSweep = Date.now()

function sweep (now) {
  if (now - lastSweep < 60_000) return
  lastSweep = now
  for (const [k, b] of buckets) if (b.reset <= now) buckets.delete(k)
}

// Returns null when the caller may proceed, or a Response when it may not.
export function limit (key, { max, windowMs }) {
  const now = Date.now()
  sweep(now)

  let b = buckets.get(key)
  if (!b || b.reset <= now) {
    b = { count: 0, reset: now + windowMs }
    buckets.set(key, b)
  }
  b.count++

  if (b.count > max) {
    const retry = Math.max(1, Math.ceil((b.reset - now) / 1000))
    return Response.json(
      { error: 'That is too many requests. Wait a moment and try again.' },
      { status: 429, headers: { 'retry-after': String(retry) } }
    )
  }
  return null
}

// Who is asking. Behind a proxy the socket address is the proxy, so the
// forwarded header is the only thing that identifies a caller; it can be
// spoofed, which is why this is never used for anything but throttling.
export function callerKey (req, extra = '') {
  const h = req.headers
  const ip = (h.get('x-forwarded-for') || '').split(',')[0].trim() ||
    h.get('x-real-ip') || 'unknown'
  return `${extra}:${ip}`
}
