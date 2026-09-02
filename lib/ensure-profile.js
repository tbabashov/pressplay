import { getProfile, claimHandle, upsertProfile } from '@/lib/db'
import { seedHandle, HANDLE_MAX, clampName } from '@/lib/profile'

// Fitting a suffix on means taking characters off the stem, not going over the
// limit: a 20 character name would otherwise produce a 21 character handle.
const withSuffix = (stem, n) => `${stem.slice(0, HANDLE_MAX - String(n).length)}${n}`

// Every signed-in account needs a public identity before it can publish
// anything, and the handle has to be free at the moment it is taken. Racing
// sign-ins are resolved by the store rejecting the claim, so this retries
// rather than checking first and hoping.
export async function ensureProfile ({ email, name, image }) {
  if (!email) return null

  const existing = await getProfile(email)
  if (existing?.handle) {
    // Google is the source of truth for the display name and picture until the
    // rater edits them, so a blank one gets filled in on the next sign in.
    const patch = {}
    if (!existing.name && name) patch.name = clampName(name)
    if (!existing.image && image) patch.image = image
    return Object.keys(patch).length ? upsertProfile(email, patch) : existing
  }

  const stem = seedHandle({ name, email })
  for (let n = 0; n < 30; n++) {
    const candidate = n === 0 ? stem : withSuffix(stem, n + 1)
    const { ok } = await claimHandle(email, candidate)
    if (ok) {
      return upsertProfile(email, {
        name: clampName(name) || candidate,
        image: image || null,
        bio: ''
      })
    }
  }

  // Thirty collisions on one stem means the numeric tail is exhausted for this
  // name. A random tail always terminates.
  const rand = withSuffix(stem, Math.floor(Math.random() * 100000))
  const { ok } = await claimHandle(email, rand)
  if (!ok) return null
  return upsertProfile(email, { name: clampName(name) || rand, image: image || null, bio: '' })
}
