// Rules only, no crypto. The sign in form is a client component, and importing
// the hashing module there drags node:crypto into the browser bundle.
export const PASSWORD_MIN = 8
export const PASSWORD_MAX = 200

export function passwordError (password) {
  const p = String(password || '')
  if (p.length < PASSWORD_MIN) return `Passwords are at least ${PASSWORD_MIN} characters.`
  if (p.length > PASSWORD_MAX) return 'That password is too long.'
  return null
}
