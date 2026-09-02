import { getCredentials, setPassword, getProfile } from '@/lib/db'
import { ensureProfile } from '@/lib/ensure-profile'
import { hashPassword, passwordError } from '@/lib/password'
import { clampName } from '@/lib/profile'
import { limit, callerKey } from '@/lib/rate-limit'

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST (req) {
  // Account creation is unauthenticated by definition, so this is the only
  // thing standing between the database and a script.
  const stop = limit(callerKey(req, 'register'), { max: 5, windowMs: 60 * 60 * 1000 })
  if (stop) return stop

  let body
  try { body = await req.json() } catch { return Response.json({ error: 'Bad request.' }, { status: 400 }) }

  const email = String(body.email || '').trim().toLowerCase()
  const password = String(body.password || '')
  const name = clampName(body.name)

  if (!EMAIL.test(email)) return Response.json({ error: 'That does not look like an email address.', field: 'email' }, { status: 400 })
  const bad = passwordError(password)
  if (bad) return Response.json({ error: bad, field: 'password' }, { status: 400 })

  // An address that already has a password is taken. An address known only to
  // Google has no password yet, and setting one here would let anyone who knows
  // the address take the account over, so it is refused too.
  const existing = await getCredentials(email)
  if (existing) {
    return Response.json({ error: 'That address already has an account. Sign in instead.', field: 'email' }, { status: 409 })
  }
  const known = await getProfile(email)
  if (known) {
    return Response.json({
      error: 'That address already signed in with Google. Use the Google button.',
      field: 'email'
    }, { status: 409 })
  }

  await setPassword(email, await hashPassword(password))
  await ensureProfile({ email, name: name || email.split('@')[0], image: null })

  return Response.json({ ok: true }, { status: 201 })
}
