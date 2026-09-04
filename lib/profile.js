// Who a rater is in public. The account is an email address; the profile is
// everything a stranger is allowed to see, and the handle is the only part of
// it that appears in a URL.

// Emails never appear on a public surface. A handle is what a rater is
// addressed by, so it has to survive being typed, linked and read aloud.
export const HANDLE_MIN = 3
export const HANDLE_MAX = 20
const HANDLE_OK = /^[a-z0-9_]+$/

// Names that would collide with a route or read as official.
const RESERVED = new Set([
  'admin', 'about', 'api', 'app', 'auth', 'browse', 'dev', 'help', 'login',
  'logout', 'me', 'new', 'owner', 'pressplay', 'privacy', 'render', 'review',
  'reviews', 'root', 'settings', 'signin', 'signout', 'staff', 'support',
  'terms', 'u', 'user', 'users', 'you'
])

export function handleError (handle) {
  const h = String(handle || '')
  if (h.length < HANDLE_MIN) return `Handles are at least ${HANDLE_MIN} characters.`
  if (h.length > HANDLE_MAX) return `Handles are at most ${HANDLE_MAX} characters.`
  if (!HANDLE_OK.test(h)) return 'Letters, numbers and underscores only, all lowercase.'
  if (RESERVED.has(h)) return 'That handle is reserved.'
  return null
}

// Turn anything into the closest legal handle. Used to seed a first handle from
// a Google display name, and to sanitise what someone types before validating.
export function slugify (input) {
  const base = String(input || '')
    .toLowerCase()
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/_{2,}/g, '_')
    .replace(/^_+|_+$/g, '')
  return base.slice(0, HANDLE_MAX)
}

// A first handle from whatever Google gave us. Falls back through name, then
// the local part of the address, then a generic, because any of them can be
// empty or turn into nothing once stripped to legal characters.
export function seedHandle ({ name, email }) {
  const candidates = [slugify(name), slugify(String(email || '').split('@')[0]), 'listener']
  const first = candidates.find(c => c && c.length >= HANDLE_MIN) || 'listener'
  return first
}

// The bio is one paragraph, not a page. Trimmed rather than rejected, because
// losing what someone typed to a validation error is worse than a short bio.
export const BIO_MAX = 240
export const clampBio = bio => String(bio || '').replace(/\s+/g, ' ').trim().slice(0, BIO_MAX)
export const clampName = name => String(name || '').replace(/\s+/g, ' ').trim().slice(0, 60)

// Accounts that carry a check.
//
// Read from the environment rather than stored on the row, because a verified
// flag in the database is a flag someone can set: anything that can write a
// profile could hand itself the mark. VERIFIED_EMAILS is a comma separated
// list and the owner is always on it, so the site's own account needs no
// configuration to be marked.
//
// Server only. Neither variable is public, so this must never be called from a
// client component — it would quietly answer false for everyone.
const verifiedAddresses = () => new Set(
  [process.env.ADMIN_EMAIL, ...String(process.env.VERIFIED_EMAILS || '').split(',')]
    .map(e => String(e || '').trim().toLowerCase())
    .filter(Boolean)
)

export const isVerified = email => {
  const e = String(email || '').trim().toLowerCase()
  return Boolean(e) && verifiedAddresses().has(e)
}

// What a profile looks like to anyone who is not its owner. The email is the
// account key and never crosses this boundary — the check is decided here, on
// the inside, so the boolean crosses instead of the address it was decided by.
export const publicProfile = p => p && ({
  handle: p.handle,
  name: p.name || p.handle,
  image: p.image || null,
  bio: p.bio || '',
  verified: isVerified(p.email),
  joinedAt: p.createdAt || null
})
