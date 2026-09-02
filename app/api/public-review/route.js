import { auth } from '@/auth'
import { resolvePublicReview } from '@/lib/public-review'
import { publicReview } from '@/lib/social-shape'

// One published review in full, for the panel that opens beside the feed.
// The feed itself carries only enough for a card: shipping every track of
// every rating on the page would be most of a library on first paint, for
// detail nobody has asked to see yet.
export async function GET (req) {
  const url = new URL(req.url)
  const handle = url.searchParams.get('handle')
  const albumId = url.searchParams.get('albumId')
  if (!handle || !albumId) return Response.json({ error: 'Bad request.' }, { status: 400 })

  const session = await auth()
  const found = await resolvePublicReview(handle, albumId, session?.user?.email)
  if (!found) return Response.json({ error: 'Not found.' }, { status: 404 })

  return Response.json({ review: publicReview(found.review) })
}
