import { getProfileByHandle, getReview } from '@/lib/db'

// A public URL names a handle; the store is keyed by email. Resolving the two
// is the same job on the page and in the comments route, and getting it wrong
// in one place is how an unpublished review leaks, so it happens once here.
//
// The owner can always open their own review at its public address. That is
// what makes the link worth checking before publishing it.
export async function resolvePublicReview (handle, albumId, viewerEmail) {
  const profile = await getProfileByHandle(handle)
  if (!profile) return null

  const review = await getReview(profile.email, albumId)
  if (!review) return null

  const isOwner = Boolean(viewerEmail) && viewerEmail === profile.email
  if (!review.published && !isOwner) return null

  return { profile, review, isOwner }
}
