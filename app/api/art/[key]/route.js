import { decodeArtKey, fetchArt } from '../shared.js'

// The target URL is carried in the path rather than the query.
//
// A cover used to be requested as /api/art?u=<the whole url>, which meant every
// cover on a page had an identical path and differed only after the question
// mark. Caches that key on the part before the query — the rasteriser this app
// captures PNGs with is one, by default — therefore treated all of them as the
// same resource, and whichever cover was fetched first was drawn in place of
// every other one. A ranking slide showed six covers on screen and downloaded
// with the same cover on five of the six rows.
//
// Telling that one library to include the query string fixes it for that
// library. Putting the target in the path fixes it for anything that will ever
// look at these URLs, which is the difference between a patched symptom and a
// URL that is simply correct.
export async function GET (req, { params }) {
  const { key } = await params
  const raw = decodeArtKey(key)
  if (!raw) return new Response('bad url', { status: 400 })
  return fetchArt(raw)
}
