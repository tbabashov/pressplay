import { auth } from '@/auth'
import { listReviews, saveReview, countToday } from '@/lib/db'

const LIMITS = { member: 3, owner: Infinity }

export async function GET () {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Sign in first.' }, { status: 401 })
  return Response.json({ reviews: await listReviews(session.user.email) })
}

export async function POST (req) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Sign in first.' }, { status: 401 })
  const email = session.user.email

  let body
  try { body = await req.json() } catch { return Response.json({ error: 'Bad request.' }, { status: 400 }) }
  if (!body?.albumId) return Response.json({ error: 'Which album?' }, { status: 400 })

  // Editing something you already rated never counts against the daily limit.
  const { getReview } = await import('@/lib/db')
  const existing = await getReview(email, String(body.albumId))
  if (!existing) {
    const cap = LIMITS[session.user.role] ?? LIMITS.member
    const used = await countToday(email)
    if (used >= cap) {
      return Response.json(
        { error: `That is ${cap} albums today. The limit resets at midnight.`, limit: cap, used },
        { status: 429 })
    }
  }

  const saved = await saveReview({
    userEmail: email,
    albumId: String(body.albumId),
    albumName: body.albumName ?? null,
    artist: body.artist ?? null,
    cover: body.cover ?? null,
    year: body.year ?? null,
    scores: body.scores ?? {},
    criteria: body.criteria ?? {},
    selections: body.selections ?? {},
    nowPlaying: body.nowPlaying ?? null,
    album: body.album ?? null,
    artistImages: Array.isArray(body.artistImages) ? body.artistImages.slice(0, 3) : [],
    finalOverride: body.finalOverride || null,
    final: Number.isFinite(body.final) ? body.final : null,
    published: !!body.published
  })
  return Response.json({ review: saved })
}
