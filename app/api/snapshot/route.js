import { auth } from '@/auth'
import { listReviews, getSnapshot, saveSnapshot, clearSnapshot } from '@/lib/db'
import { rank, ranksOf, ratingsOf } from '@/lib/standings'

export async function GET () {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Sign in first.' }, { status: 401 })
  return Response.json({ snapshot: await getSnapshot(session.user.email) })
}

// Freeze the current standings, so later changes can be shown as movement.
export async function POST () {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Sign in first.' }, { status: 401 })
  const ranked = rank(await listReviews(session.user.email))
  return Response.json({
    snapshot: await saveSnapshot(session.user.email, ranksOf(ranked), ratingsOf(ranked))
  })
}

export async function DELETE () {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Sign in first.' }, { status: 401 })
  await clearSnapshot(session.user.email)
  return Response.json({ ok: true })
}
