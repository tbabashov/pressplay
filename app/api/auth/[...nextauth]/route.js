import { handlers } from '@/auth'
import { limit, callerKey } from '@/lib/rate-limit'

export const { GET } = handlers

// Registering and resetting were throttled from the start; signing in was not,
// which left the one door that takes an unlimited number of guesses as the only
// one standing wide open. scrypt makes each guess expensive to check, but
// expensive is not the same as refused, and a script does not mind waiting.
//
// Only the credentials callback is counted. This one route also serves the
// session, csrf and sign-out endpoints, and the app calls those on ordinary
// navigation, so throttling the whole POST would sign people out for browsing.
const LOGIN = /\/callback\/credentials\/?$/

export async function POST (req) {
  if (LOGIN.test(new URL(req.url).pathname)) {
    // Twelve attempts a quarter hour. Enough that someone who genuinely cannot
    // remember which password they used is never stopped, and far too few for
    // a list to be worked through.
    //
    // Counted per address, not per address-and-email: keying in the email would
    // hand an attacker a fresh allowance for every account they tried, which is
    // exactly the shape of a spraying run.
    const stop = limit(callerKey(req, 'login'), { max: 12, windowMs: 15 * 60 * 1000 })
    if (stop) return stop
  }
  return handlers.POST(req)
}
