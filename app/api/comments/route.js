import { auth } from '@/auth'
import { addComment, getProfile, reviewId } from '@/lib/db'
import { resolvePublicReview } from '@/lib/public-review'
import { publicComment } from '@/lib/social-shape'
import { commentsFor } from '@/lib/social-queries'
import { limit, callerKey } from '@/lib/rate-limit'

const BODY_MAX = 1000

export async function GET (req) {
  const url = new URL(req.url)
  const handle = url.searchParams.get('handle')
  const albumId = url.searchParams.get('albumId')
  if (!handle || !albumId) return Response.json({ error: 'Bad request.' }, { status: 400 })

  const session = await auth()
  const found = await resolvePublicReview(handle, albumId, session?.user?.email)
  if (!found) return Response.json({ error: 'Not found.' }, { status: 404 })

  const comments = await commentsFor(reviewId(found.profile.email, albumId))
  return Response.json({ comments })
}

export async function POST (req) {
  const stop = limit(callerKey(req, 'comment'), { max: 20, windowMs: 5 * 60 * 1000 })
  if (stop) return stop

  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Sign in to comment.' }, { status: 401 })

  let body
  try { body = await req.json() } catch { return Response.json({ error: 'Bad request.' }, { status: 400 }) }
  const { handle, albumId } = body
  if (!handle || !albumId) return Response.json({ error: 'Bad request.' }, { status: 400 })

  const text = String(body.body || '').trim()
  if (!text) return Response.json({ error: 'Say something first.' }, { status: 400 })
  if (text.length > BODY_MAX) {
    return Response.json({ error: `Comments are at most ${BODY_MAX} characters.` }, { status: 400 })
  }

  // Commenting is publishing onto someone else's page, so the same visibility
  // rule that hides a draft has to refuse a comment on one.
  const found = await resolvePublicReview(handle, albumId, session.user.email)
  if (!found || !found.review.published) {
    return Response.json({ error: 'Not found.' }, { status: 404 })
  }

  const saved = await addComment({
    reviewId: reviewId(found.profile.email, albumId),
    authorEmail: session.user.email,
    body: text
  })
  const author = await getProfile(session.user.email)
  return Response.json({ comment: publicComment(saved, author) }, { status: 201 })
}
