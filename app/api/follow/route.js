import { auth } from '@/auth'
import { getProfileByHandle, follow, unfollow } from '@/lib/db'

async function target (req, session) {
  let body
  try { body = await req.json() } catch { return { error: 'Bad request.', status: 400 } }
  if (!body?.handle) return { error: 'Bad request.', status: 400 }

  const profile = await getProfileByHandle(body.handle)
  if (!profile) return { error: 'No such rater.', status: 404 }
  if (profile.email === session.user.email) {
    return { error: 'You already have your own leaderboard.', status: 400 }
  }
  return { profile }
}

export async function POST (req) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Sign in to follow.' }, { status: 401 })
  const t = await target(req, session)
  if (t.error) return Response.json({ error: t.error }, { status: t.status })

  await follow(session.user.email, t.profile.email)
  return Response.json({ following: true })
}

export async function DELETE (req) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Sign in first.' }, { status: 401 })
  const t = await target(req, session)
  if (t.error) return Response.json({ error: t.error }, { status: t.status })

  await unfollow(session.user.email, t.profile.email)
  return Response.json({ following: false })
}
