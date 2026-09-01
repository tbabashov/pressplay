import {
  listReviews, listProfiles, getProfile, listFollowing, listFollowers,
  countComments, listComments, reviewId
} from '@/lib/db'
import { rank } from '@/lib/standings'
import { publicCard, raterStats, publicComment } from '@/lib/social-shape'
import { publicProfile } from '@/lib/profile'

// Published only. A profile that counted drafts would advertise albums a
// visitor cannot open.
export const published = reviews => reviews.filter(r => r.published)

// One rater, as their own page shows them: who they are, what they have put
// out, and how it ranks against itself.
export async function raterPage (profile) {
  const all = await listReviews(profile.email)
  const live = published(all)
  const ranked = rank(live).map(r => ({ ...publicCard(r), rank: r.rank }))

  const counts = await countComments(live.map(r => reviewId(profile.email, r.albumId)))
  const withComments = ranked.map(r => ({
    ...r, comments: counts[reviewId(profile.email, r.albumId)] || 0
  }))

  const [following, followers] = await Promise.all([
    listFollowing(profile.email), listFollowers(profile.email)
  ])

  return {
    profile: publicProfile(profile),
    albums: withComments,
    stats: raterStats(live),
    following: following.length,
    followers: followers.length,
    // The owner's own drafts, counted but never listed, so the settings page
    // can say what is still unpublished without leaking it here.
    drafts: all.length - live.length
  }
}

// The discovery list. Anyone who has published something is on it; an account
// with nothing public has nothing to browse, so it stays off.
export async function raters ({ excludeEmail } = {}) {
  const profiles = await listProfiles()
  const rows = await Promise.all(profiles.map(async p => {
    const live = published(await listReviews(p.email))
    if (!live.length) return null
    const stats = raterStats(live)
    const top = rank(live).slice(0, 4).map(publicCard)
    return { profile: publicProfile(p), stats, top, email: p.email }
  }))

  return rows
    .filter(Boolean)
    .filter(r => r.email !== excludeEmail)
    // Most published first, then the higher average, so an empty-ish account
    // never outranks someone with a body of work.
    .sort((a, b) => (b.stats.albums - a.stats.albums) || ((b.stats.average ?? 0) - (a.stats.average ?? 0)))
    .map(({ email, ...rest }) => rest)
}

// What the people you follow have published lately.
export async function feed (email, limit = 40) {
  const targets = await listFollowing(email)
  const rows = await Promise.all(targets.map(async t => {
    const [profile, reviews] = await Promise.all([getProfile(t), listReviews(t)])
    if (!profile) return []
    return published(reviews).map(r => ({ ...publicCard(r), by: publicProfile(profile) }))
  }))

  return rows.flat()
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
    .slice(0, limit)
}

// A thread with its authors resolved. Profiles are fetched once per distinct
// address, so a long argument between two people is two lookups rather than
// one per reply.
export async function commentsFor (id) {
  const comments = await listComments(id)
  const emails = [...new Set(comments.map(c => c.authorEmail))]
  const profiles = Object.fromEntries(
    await Promise.all(emails.map(async e => [e, await getProfile(e)])))
  return comments.map(c => publicComment(c, profiles[c.authorEmail]))
}
