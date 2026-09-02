import { auth } from '@/auth'
import { getCredentials, setPassword } from '@/lib/db'
import { hashPassword, verifyPassword, passwordError } from '@/lib/password'
import { limit, callerKey } from '@/lib/rate-limit'

// Changing a password is the one authenticated action worth throttling on its
// own: the current password is checked here, so an unthrottled route is an
// oracle for guessing it from a session that has already been taken.
export async function POST (req) {
  const stop = limit(callerKey(req, 'password'), { max: 10, windowMs: 15 * 60 * 1000 })
  if (stop) return stop

  const session = await auth()
  if (!session?.user?.email) {
    return Response.json({ error: 'Sign in first.' }, { status: 401 })
  }

  let body
  try { body = await req.json() } catch {
    return Response.json({ error: 'Bad request.' }, { status: 400 })
  }

  const current = String(body.current ?? '')
  const next = String(body.next ?? '')

  const creds = await getCredentials(session.user.email)
  // An account that has only ever come in through Google has nothing to
  // change, and letting it set a password from a signed-in session would be a
  // second way in that the owner never asked for.
  if (!creds) {
    return Response.json({
      error: 'This account signs in with Google, so there is no password to change.'
    }, { status: 400 })
  }

  if (!(await verifyPassword(current, creds.passwordHash))) {
    return Response.json(
      { error: 'That is not your current password.', field: 'current' }, { status: 400 })
  }

  const bad = passwordError(next)
  if (bad) return Response.json({ error: bad, field: 'next' }, { status: 400 })

  // Checked against the stored hash rather than against the string typed above,
  // so it still catches a repeat when the two boxes were filled differently.
  if (await verifyPassword(next, creds.passwordHash)) {
    return Response.json(
      { error: 'That is the password you already have.', field: 'next' }, { status: 400 })
  }

  await setPassword(session.user.email, await hashPassword(next))
  return Response.json({ ok: true })
}
