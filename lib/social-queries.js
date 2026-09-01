import {
  listReviews, listProfiles, getProfile, listFollowing, listFollowers,
  countComments, listComments, voteTotals, myVotes, reviewId
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

// Everything anyone has published, newest or best first. This is the room the
// site did not have: a profile shows one person and the following list shows
// the people you already chose, so nothing put a stranger's rating in front of
// you. Vote counts and comment counts are fetched once for the whole page
// rather than per row.
const EMPTY_VOTES = { up: 0, down: 0, score: 0 }

export async function discover ({ sort = 'recent', viewerEmail = null, limit = 60 } = {}) {
  const profiles = await listProfiles()
  const rows = (await Promise.all(profiles.map(async p => {
    const live = published(await listReviews(p.email))
    return live.map(r => ({
      ...publicCard(r),
      id: reviewId(p.email, r.albumId),
      by: publicProfile(p)
    }))
  }))).flat()

  const ids = rows.map(r => r.id)
  const [votes, mine, comments] = await Promise.all([
    voteTotals(ids),
    viewerEmail ? myVotes(viewerEmail, ids) : Promise.resolve({}),
    countComments(ids)
  ])

  const full = rows.map(r => ({
    ...r,
    votes: votes[r.id] || EMPTY_VOTES,
    myVote: mine[r.id] ?? 0,
    comments: comments[r.id] || 0
  }))

  // Popular ranks on the vote score, then on the conversation a rating started,
  // and only then on how recent it is, so a new rating with nothing on it does
  // not sit above one people actually argued about.
  const byRecent = (a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || '')
  full.sort(sort === 'popular'
    ? (a, b) => (b.votes.score - a.votes.score) || (b.comments - a.comments) || byRecent(a, b)
    : byRecent)

  return full.slice(0, limit)
}

// The same shape as discover, for the people you follow. Sharing the shape is
// what lets one list component render either tab.
export async function followedFeed ({ viewerEmail, limit = 60 } = {}) {
  const targets = await listFollowing(viewerEmail)
  const rows = (await Promise.all(targets.map(async t => {
    const [profile, reviews] = await Promise.all([getProfile(t), listReviews(t)])
    if (!profile) return []
    return published(reviews).map(r => ({
      ...publicCard(r), id: reviewId(t, r.albumId), by: publicProfile(profile)
    }))
  }))).flat()

  const ids = rows.map(r => r.id)
  const [votes, mine, comments] = await Promise.all([
    voteTotals(ids), myVotes(viewerEmail, ids), countComments(ids)
  ])

  return rows
    .map(r => ({ ...r, votes: votes[r.id] || EMPTY_VOTES, myVote: mine[r.id] ?? 0, comments: comments[r.id] || 0 }))
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
