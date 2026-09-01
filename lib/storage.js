import { randomBytes } from 'node:crypto'

// Covers people upload go to Supabase Storage rather than into the database.
// Inlining one as a data URL is what made a single export ship three megabytes
// and crash the render, so the store keeps a short URL and the bytes live
// somewhere built to serve bytes.
//
// The project reference is already in DATABASE_URL, so only the service key has
// to be supplied. Without it this returns null and the caller falls back to
// inlining a shrunken copy: the feature works either way, it is just heavier
// until the key is there.

export function supabaseUrl () {
  if (process.env.SUPABASE_URL) return process.env.SUPABASE_URL.replace(/\/$/, '')
  const m = /postgres\.([a-z0-9]{16,})/i.exec(process.env.DATABASE_URL || '')
  return m ? `https://${m[1]}.supabase.co` : null
}

export const storageReady = () =>
  Boolean(supabaseUrl() && process.env.SUPABASE_SERVICE_ROLE_KEY)

const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }

const slug = s => String(s || 'cover').toLowerCase().normalize('NFKD')
  .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '').slice(0, 40) || 'cover'

export async function uploadCover (bytes, contentType, hint) {
  if (!storageReady()) return null

  const ext = EXT[contentType] || 'jpg'
  // A random tail, so re-uploading a cover for the same album never collides
  // with the old one and never serves a stale image out of a CDN cache.
  const name = `${slug(hint)}-${randomBytes(4).toString('hex')}.${ext}`
  const base = supabaseUrl()

  const res = await fetch(`${base}/storage/v1/object/covers/${name}`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'content-type': contentType,
      'cache-control': '31536000'
    },
    body: bytes
  })

  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Storage refused the upload (${res.status}). ${detail.slice(0, 120)}`)
  }
  return `${base}/storage/v1/object/public/covers/${name}`
}
