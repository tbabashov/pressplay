import { auth } from '@/auth'
import {
  getProfile, listReviews, getPreferences, listDiscography, getSnapshot,
  listFollowing, listFollowers
} from '@/lib/db'
import { limit, callerKey } from '@/lib/rate-limit'

// Everything this account has, as one file it can keep.
//
// The privacy page already offers a copy of everything held about you, and the
// landing page says you can take your ratings out. Until now both of those were
// a promise a person had to fulfil by hand. This is the same answer, given by
// the app, immediately.
//
// It carries what the account made, not what the catalogue lent it: the scores,
// the criteria, the corrections to a tracklist. Album artwork is a URL rather
// than an image, because the point is the ratings.
export async function GET (req) {
  // Assembling this reads most of an account's rows, so it is not a thing to
  // allow on a loop.
  const stop = limit(callerKey(req, 'export'), { max: 6, windowMs: 60 * 60 * 1000 })
  if (stop) return stop

  const session = await auth()
  if (!session?.user?.email) {
    return Response.json({ error: 'Sign in first.' }, { status: 401 })
  }
  const email = session.user.email

  const [profile, reviews, preferences, discography, snapshot, following, followers] =
    await Promise.all([
      getProfile(email),
      listReviews(email),
      getPreferences(email),
      listDiscography(email),
      getSnapshot(email),
      listFollowing(email),
      listFollowers(email)
    ])

  const payload = {
    exportedAt: new Date().toISOString(),
    format: 1,
    account: {
      email,
      handle: profile?.handle ?? null,
      name: profile?.name ?? null,
      bio: profile?.bio ?? null,
      tier: profile?.tier ?? 'free',
      createdAt: profile?.createdAt ?? null
    },
    // The rating model, so a library is readable later: a score means nothing
    // without the ladder it was given on.
    ratingModel: preferences ?? null,
    reviews: reviews.map(r => ({
      albumId: r.albumId,
      album: r.albumName,
      artist: r.artist,
      year: r.year,
      cover: r.cover,
      published: !!r.published,
      final: r.final ?? null,
      finalOverride: r.finalOverride ?? null,
      scores: r.scores ?? {},
      criteria: r.criteria ?? {},
      selections: r.selections ?? {},
      // The ladder this one was rated on, which can differ from the current one.
      scaleModel: r.scaleModel ?? null,
      criteriaModel: r.criteriaModel ?? null,
      tracklist: (r.album?.tracks ?? []).map(t => ({
        n: t.trackNumber ?? null,
        title: t.name ?? t.title ?? null,
        features: t.features ?? [],
        durationMs: t.durationMs ?? null
      })),
      createdAt: r.createdAt ?? null,
      updatedAt: r.updatedAt ?? null
    })),
    discography: discography ?? [],
    frozenStandings: snapshot ?? null,
    // Handles, not addresses. Somebody else's email is not this account's to
    // hand out just because they follow it.
    following: (following ?? []).map(p => p.handle).filter(Boolean),
    followers: (followers ?? []).map(p => p.handle).filter(Boolean)
  }

  const stamp = new Date().toISOString().slice(0, 10)
  return new Response(JSON.stringify(payload, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': `attachment; filename="press-play-${profile?.handle || 'export'}-${stamp}.json"`,
      // A file about one person, assembled per request.
      'cache-control': 'no-store, private'
    }
  })
}
