import { auth } from '@/auth'
import { castVote, voteTotals, myVotes, reviewId } from '@/lib/db'
import { resolvePublicReview } from '@/lib/public-review'

// A vote is a public act on someone else's page, so it goes through the same
// resolver the comments route uses: a handle and an album id, never an address,
// and never a review the viewer is not allowed to see.
export async function POST (req) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Sign in to vote.' }, { status: 401 })

  let body
  try { body = await req.json() } catch { return Response.json({ error: 'Bad request.' }, { status: 400 }) }

  const { handle, albumId } = body
  if (!handle || !albumId) return Response.json({ error: 'Bad request.' }, { status: 400 })

  const value = Number(body.value)
  if (![1, 0, -1].includes(value)) {
    return Response.json({ error: 'A vote is up, down, or nothing.' }, { status: 400 })
  }

  const found = await resolvePublicReview(handle, albumId, session.user.email)
  if (!found || !found.review.published) {
    return Response.json({ error: 'Not found.' }, { status: 404 })
  }
  // Voting on your own rating would let anyone lead the popular list alone.
  if (found.profile.email === session.user.email) {
    return Response.json({ error: 'You cannot vote on your own rating.' }, { status: 403 })
  }

  const id = reviewId(found.profile.email, albumId)
  await castVote(id, session.user.email, value)

  const [totals, mine] = await Promise.all([voteTotals([id]), myVotes(session.user.email, [id])])
  return Response.json({
    votes: totals[id] || { up: 0, down: 0, score: 0 },
    myVote: mine[id] ?? 0
  })
}
