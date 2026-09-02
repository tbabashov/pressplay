import { fetchArt } from './shared.js'

// The older query form, kept working because URLs of this shape may still be
// sitting in a rendered page or a cache somewhere. New links are built by
// artUrl() and carry the target in the path instead, for the reason set out in
// app/api/art/[key]/route.js.
export async function GET (req) {
  const raw = new URL(req.url).searchParams.get('u')
  if (!raw) return new Response('missing url', { status: 400 })
  return fetchArt(raw)
}
