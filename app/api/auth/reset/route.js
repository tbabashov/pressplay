import { createHash, randomBytes } from 'node:crypto'
import { getCredentials, createReset, takeReset, clearResets, setPassword, getProfile } from '@/lib/db'
import { hashPassword, passwordError } from '@/lib/password'
import { sendMail } from '@/lib/email'
import { SITE_URL } from '@/lib/site-url'
import { limit, callerKey } from '@/lib/rate-limit'

// An hour is long enough to find the mail and short enough that a link left in
// an inbox stops working the same day.
const TTL_MS = 60 * 60 * 1000

// The token is random and long; only its hash is stored. A database that leaks
// therefore hands over nothing that can reset anybody's password.
const hash = t => createHash('sha256').update(String(t)).digest('hex')

// POST asks for a link. PUT uses one.
export async function POST (req) {
  // Harder than most: this one sends mail to an address the sender chooses, so
  // an open loop is a way to use this app to post to somebody's inbox.
  const stop = limit(callerKey(req, 'reset-ask'), { max: 5, windowMs: 30 * 60 * 1000 })
  if (stop) return stop

  let body
  try { body = await req.json() } catch { return Response.json({ error: 'Bad request.' }, { status: 400 }) }
  const email = String(body?.email ?? '').trim().toLowerCase()

  // The same answer whether or not the address has an account. Saying "no such
  // account" turns this into a way to ask which addresses are registered.
  const same = Response.json({
    ok: true,
    message: 'If that address has a password on it, a link is on its way.'
  })
  if (!email) return same

  const creds = await getCredentials(email)
  if (!creds) {
    // No password on this address: either there is no account, or it signs in
    // with Google and has nothing here to reset. The reply to the browser is
    // the same either way, so nothing leaks — but a real account holder who
    // asked for a link and then waits for a mail that was never coming has no
    // way to find that out. So they get one saying which door is theirs.
    const account = await getProfile(email).catch(() => null)
    if (account) {
      await sendMail({
        to: email,
        subject: 'Signing in to Press Play',
        text: [
          'Somebody asked to reset a password on this address.',
          '',
          'There is no password on it: this account signs in with Google. Use',
          'the Google button and you are in.',
          '',
          `${SITE_URL}/join`,
          '',
          'If this was not you, nothing has changed and you can ignore this.'
        ].join('\n'),
        html: `<p>Somebody asked to reset a password on this address.</p>
<p>There is no password on it: this account signs in with Google.
<a href="${SITE_URL}/join">Use the Google button</a> and you are in.</p>
<p>If this was not you, nothing has changed and you can ignore this.</p>`
      })
    }
    return same
  }

  // Asking again retires the links already sent.
  await clearResets(email)

  const token = randomBytes(32).toString('base64url')
  await createReset(hash(token), email, new Date(Date.now() + TTL_MS))

  const link = `${SITE_URL}/reset?token=${encodeURIComponent(token)}`
  await sendMail({
    to: email,
    subject: 'Reset your Press Play password',
    text: [
      'Somebody asked to reset the password on this address.',
      '',
      link,
      '',
      'The link works once and stops working in an hour.',
      'If this was not you, nothing has changed and you can ignore this.'
    ].join('\n'),
    html: `<p>Somebody asked to reset the password on this address.</p>
<p><a href="${link}">Choose a new password</a></p>
<p>The link works once and stops working in an hour. If this was not you,
nothing has changed and you can ignore this.</p>`
  })

  return same
}

export async function PUT (req) {
  const stop = limit(callerKey(req, 'reset-use'), { max: 10, windowMs: 30 * 60 * 1000 })
  if (stop) return stop

  let body
  try { body = await req.json() } catch { return Response.json({ error: 'Bad request.' }, { status: 400 }) }
  const token = String(body?.token ?? '')
  const password = String(body?.password ?? '')

  const bad = passwordError(password)
  if (bad) return Response.json({ error: bad, field: 'password' }, { status: 400 })

  // Spends the token and returns whose it was, in one statement, so the same
  // link cannot be used twice by two requests arriving together.
  const email = token ? await takeReset(hash(token)) : null
  if (!email) {
    return Response.json({
      error: 'That link has expired or has already been used. Ask for a new one.'
    }, { status: 400 })
  }

  await setPassword(email, await hashPassword(password))
  // Any other link that was outstanding dies with it.
  await clearResets(email)

  return Response.json({ ok: true })
}
