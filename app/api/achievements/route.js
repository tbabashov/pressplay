import { auth } from '@/auth'
import {
  listReviews, countCommentsBy, voteTotals, listFollowers,
  getPreferences, savePreferences, reviewId
} from '@/lib/db'
import { achievementsFor } from '@/lib/achievements'
import { normalisePreferences } from '@/lib/preferences'

// What has been earned since the last time anyone asked.
//
// Achievements are counted off the library rather than written down when they
// happen, which means nothing knows the moment one is earned. The set that has
// already been announced is the one thing worth remembering: the difference
// between that and what is currently true is what to tell someone about, and
// marking them announced in the same request is what stops the same badge
// arriving on every page load.
export async function GET () {
  const session = await auth()
  if (!session?.user) return Response.json({ earned: [] })

  const email = session.user.email
  const reviews = await listReviews(email)
  const ids = reviews.map(r => reviewId(email, r.albumId))
  const [commentsWritten, votes, followers, stored] = await Promise.all([
    countCommentsBy(email), voteTotals(ids), listFollowers(email), getPreferences(email)
  ])

  const list = achievementsFor({
    reviews,
    commentsWritten,
    upvotes: Object.values(votes).reduce((n, v) => n + v.up, 0),
    followers: followers.length
  })

  const prefs = stored ? normalisePreferences(stored) : null
  const seen = new Set(prefs?.seenAchievements || [])
  const earned = list.filter(a => a.earned)

  // The first look announces nothing: an account that rated a hundred albums
  // before any of this existed should not be met with sixteen notifications at
  // once. It is marked by a sentinel written on that first look rather than by
  // the list being empty, because a new account earns nothing on its first look
  // either, and without the sentinel it stayed "first" until it earned
  // something, which is exactly the moment it should have been told.
  const INIT = '@seen'
  const firstLook = !seen.has(INIT)
  const fresh = firstLook ? [] : earned.filter(a => !seen.has(a.key))

  if (firstLook || fresh.length) {
    await savePreferences(email, {
      ...(prefs || {}),
      seenAchievements: [INIT, ...seen, ...earned.map(a => a.key)]
    })
  }

  return Response.json({
    earned: fresh.map(({ key, name, about }) => ({ key, name, about })),
    total: list.length,
    done: earned.length
  })
}
