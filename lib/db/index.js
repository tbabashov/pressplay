// Saving has one interface and two backings. Without DATABASE_URL it writes to a
// JSON file so the app is usable on a laptop with no setup; with DATABASE_URL it
// talks to Postgres, which is what production needs. Nothing above this file
// knows which one is in use.
import * as file from './file.js'

let impl = null

async function backend () {
  if (impl) return impl
  if (process.env.DATABASE_URL) {
    const pg = await import('./postgres.js')
    await pg.init()
    impl = pg
  } else {
    await file.init()
    impl = file
  }
  return impl
}

export const driver = () => (process.env.DATABASE_URL ? 'postgres' : 'file')

export async function getReview (email, albumId) {
  return (await backend()).getReview(email, albumId)
}
export async function saveReview (review) {
  return (await backend()).saveReview(review)
}
export async function listReviews (email) {
  return (await backend()).listReviews(email)
}
export async function deleteReview (email, albumId) {
  return (await backend()).deleteReview(email, albumId)
}
export async function countToday (email) {
  return (await backend()).countToday(email)
}
export async function getSnapshot (email) {
  return (await backend()).getSnapshot(email)
}
export async function saveSnapshot (email, ranks, ratings) {
  return (await backend()).saveSnapshot(email, ranks, ratings)
}
export async function clearSnapshot (email) {
  return (await backend()).clearSnapshot(email)
}
export async function listDiscography (email) {
  return (await backend()).listDiscography(email)
}
export async function saveDiscographyEntry (email, entry) {
  return (await backend()).saveDiscographyEntry(email, entry)
}
export async function deleteDiscographyEntry (email, id) {
  return (await backend()).deleteDiscographyEntry(email, id)
}

// A review's id is composite everywhere: the same album rated by two people is
// two reviews with two comment threads. Callers outside the store need to name
// one, so the rule lives here rather than being rebuilt at each call site.
export const reviewId = (email, albumId) => `${email}::${albumId}`

// ---------- Public profiles ----------
export async function getProfile (email) {
  return (await backend()).getProfile(email)
}
export async function getProfileByHandle (handle) {
  return (await backend()).getProfileByHandle(handle)
}
export async function listProfiles () {
  return (await backend()).listProfiles()
}
export async function upsertProfile (email, patch) {
  return (await backend()).upsertProfile(email, patch)
}
export async function claimHandle (email, handle) {
  return (await backend()).claimHandle(email, handle)
}

export async function countCommentsBy (email) {
  return (await backend()).countCommentsBy(email)
}

// ---------- Votes ----------
export async function castVote (reviewId, email, value) {
  return (await backend()).castVote(reviewId, email, value)
}
export async function voteTotals (ids) {
  return (await backend()).voteTotals(ids)
}
export async function myVotes (email, ids) {
  return (await backend()).myVotes(email, ids)
}

// ---------- Comments ----------
export async function listComments (id) {
  return (await backend()).listComments(id)
}
export async function addComment (comment) {
  return (await backend()).addComment(comment)
}
export async function getComment (id) {
  return (await backend()).getComment(id)
}
export async function deleteComment (id) {
  return (await backend()).deleteComment(id)
}
export async function countComments (ids) {
  return (await backend()).countComments(ids)
}

// ---------- Follows ----------
export async function follow (follower, target) {
  return (await backend()).follow(follower, target)
}
export async function unfollow (follower, target) {
  return (await backend()).unfollow(follower, target)
}
export async function isFollowing (follower, target) {
  return (await backend()).isFollowing(follower, target)
}
export async function listFollowing (email) {
  return (await backend()).listFollowing(email)
}
export async function listFollowers (email) {
  return (await backend()).listFollowers(email)
}

// ---------- Passwords ----------
export async function getCredentials (email) {
  return (await backend()).getCredentials(email)
}
export async function setPassword (email, hash) {
  return (await backend()).setPassword(email, hash)
}

// ---------- Rating model ----------
export async function getPreferences (email) {
  return (await backend()).getPreferences(email)
}
export async function savePreferences (email, value) {
  return (await backend()).savePreferences(email, value)
}
