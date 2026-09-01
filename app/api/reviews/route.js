import { auth } from '@/auth'
import { listReviews, saveReview, countToday, getReview } from '@/lib/db'
import { normaliseCriteria } from '@/lib/preferences'

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

  // Only what was actually sent is written. Defaulting an absent field to null
  // meant any save that omitted one wiped it, and a save that omitted all of
  // them emptied the review while leaving the row in place: a rated album
  // silently became a blank one, still counted but with no name and no score.
  const has = k => Object.prototype.hasOwnProperty.call(body, k)
  const take = (k, coerce = v => v) => (has(k) ? coerce(body[k]) : existing?.[k])

  const saved = await saveReview({
    ...existing,
    userEmail: email,
    albumId: String(body.albumId),
    albumName: take('albumName'),
    artist: take('artist'),
    cover: take('cover'),
    year: take('year'),
    scores: take('scores', v => v ?? {}),
    criteria: take('criteria', v => v ?? {}),
    selections: take('selections', v => v ?? {}),
    nowPlaying: take('nowPlaying'),
    album: take('album', v => v ?? existing?.album ?? null),
    artistImages: has('artistImages')
      ? (Array.isArray(body.artistImages) ? body.artistImages.slice(0, 3) : [])
      : (existing?.artistImages ?? []),
    finalOverride: has('finalOverride') ? (body.finalOverride || null) : (existing?.finalOverride ?? null),
    final: has('final')
      ? (Number.isFinite(body.final) ? body.final : null)
      : (existing?.final ?? null),
    published: has('published') ? !!body.published : !!existing?.published,
    criteriaModel: has('criteriaModel')
      ? normaliseCriteria(body.criteriaModel)
      : (existing?.criteriaModel ?? null)
  })
  return Response.json({ review: saved })
}
