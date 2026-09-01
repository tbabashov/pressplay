import { auth } from '@/auth'
import { getReview, deleteReview, saveReview, listComments, deleteComment, reviewId } from '@/lib/db'
import { param } from '@/lib/route-param'

export async function GET (_req, { params }) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Sign in first.' }, { status: 401 })
  const albumId = param((await params).albumId)
  return Response.json({ review: await getReview(session.user.email, albumId) })
}

// Publishing is one field, and the rating screen is not always open when it
// changes, so it moves on its own rather than through a full review save.
export async function PATCH (req, { params }) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Sign in first.' }, { status: 401 })
  const albumId = param((await params).albumId)

  let body
  try { body = await req.json() } catch { return Response.json({ error: 'Bad request.' }, { status: 400 }) }
  if (typeof body.published !== 'boolean') {
    return Response.json({ error: 'Bad request.' }, { status: 400 })
  }

  const existing = await getReview(session.user.email, albumId)
  if (!existing) return Response.json({ error: 'Not found.' }, { status: 404 })

  const saved = await saveReview({ ...existing, published: body.published })
  return Response.json({ published: saved.published })
}

export async function DELETE (_req, { params }) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Sign in first.' }, { status: 401 })
  const albumId = param((await params).albumId)

  // The thread belongs to the review. Leaving it behind would orphan comments
  // under an id that can be recreated by rating the album again, and the old
  // replies would reappear under the new rating.
  const comments = await listComments(reviewId(session.user.email, albumId))
  await Promise.all(comments.map(c => deleteComment(c.id)))

  await deleteReview(session.user.email, albumId)
  return Response.json({ ok: true })
}
