import { auth } from '@/auth'
import { getProfile, markSubscriptionCancelled } from '@/lib/db'
import { billing, LEMON_API, entitled } from '@/lib/billing'
import { limit, callerKey } from '@/lib/rate-limit'

// Cancelling a subscription, from inside the app.
//
// Until this existed the only way out of a subscription was to email somebody
// or to charge it back: the app could take money and had no button to stop.
//
// Cancelled is not the same as over. Lemon Squeezy keeps the subscription
// cancelled until the period already paid for runs out and only then sends
// `expired`, and `entitled` in lib/billing.js counts cancelled as entitled for
// exactly that reason. So this deliberately does not touch the tier — what was
// bought is kept until the day it was bought until.
//
// The webhook will say all of this again when it arrives. This writes it
// straight away anyway, because a button that appears to do nothing until a
// provider gets round to calling back is a button people press twice.
export const dynamic = 'force-dynamic'

export async function POST (req) {
  // A cancellation is not something anyone needs to do in bulk, and this
  // spends a provider API call.
  const stop = limit(callerKey(req, 'subscription-cancel'), { max: 6, windowMs: 30 * 60 * 1000 })
  if (stop) return stop

  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Sign in first.' }, { status: 401 })

  const conf = billing()
  if (!conf.apiKey) {
    return Response.json({ error: 'Billing is not switched on here.' }, { status: 503 })
  }

  const profile = await getProfile(session.user.email).catch(() => null)
  const id = profile?.subscriptionId
  if (!id) {
    return Response.json({ error: 'There is no subscription on this account.' }, { status: 400 })
  }

  // Already done. Answering ok rather than complaining: the person wanted it
  // cancelled and it is cancelled, and a second press should not read as a
  // failure.
  if (['cancelled', 'expired'].includes(String(profile.subscriptionStatus || '').toLowerCase())) {
    return Response.json({
      ok: true, already: true,
      status: profile.subscriptionStatus,
      endsAt: profile.subscriptionEndsAt || profile.subscriptionRenewsAt || null
    })
  }

  let res
  try {
    res = await fetch(`${LEMON_API}/subscriptions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: {
        Accept: 'application/vnd.api+json',
        Authorization: `Bearer ${conf.apiKey}`
      }
    })
  } catch {
    return Response.json({ error: 'Could not reach the payment provider. Try again.' }, { status: 502 })
  }

  const text = await res.text().catch(() => '')
  let body = null
  if (text) { try { body = JSON.parse(text) } catch { /* not JSON */ } }

  if (!res.ok) {
    // The provider's own message names the account, so it goes to the log and
    // not to the browser.
    console.error('cancel subscription failed', res.status, text.slice(0, 300))
    return Response.json({
      error: 'The payment provider would not cancel that. Nothing has changed.'
    }, { status: 502 })
  }

  const attrs = body?.data?.attributes ?? {}
  // What the provider says it is, falling back to what we asked for.
  const status = String(attrs.status || 'cancelled').toLowerCase()
  const endsAt = attrs.ends_at || profile.subscriptionRenewsAt || null

  const saved = await markSubscriptionCancelled(session.user.email, { status, endsAt })
    .catch(() => null)

  return Response.json({
    ok: true,
    status,
    endsAt: saved?.subscriptionEndsAt || endsAt,
    // Whether the tier is still in force. It is, until it expires, and the
    // screen says so rather than leaving somebody to wonder what they just lost.
    keeps: entitled(status),
    tier: profile.tier
  })
}
