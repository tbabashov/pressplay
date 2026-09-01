import { auth } from '@/auth'
import { getComment, deleteComment } from '@/lib/db'
import { param } from '@/lib/route-param'

// Two people can remove a comment: whoever wrote it, and whoever owns the
// review it sits under. The review id carries the owner's address, which is
// what makes the second check possible without another lookup.
export async function DELETE (_req, { params }) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Sign in first.' }, { status: 401 })

  const id = param((await params).id)
  const comment = await getComment(id)
  if (!comment) return Response.json({ error: 'Not found.' }, { status: 404 })

  const email = session.user.email
  const reviewOwner = String(comment.reviewId).split('::')[0]
  if (comment.authorEmail !== email && reviewOwner !== email) {
    return Response.json({ error: 'Not yours to remove.' }, { status: 403 })
  }

  await deleteComment(id)
  return Response.json({ ok: true })
}
