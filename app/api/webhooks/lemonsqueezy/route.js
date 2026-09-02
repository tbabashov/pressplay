import { getProfile, getProfileBySubscription, setSubscription } from '@/lib/db'
import {
  billing, canReceiveWebhooks, validSignature, subscriptionUpdate, emailFor
} from '@/lib/billing'

// Where a subscription becomes a tier.
//
// This is the only route that may raise an account's tier, and it is reachable
// by anyone who knows the URL, so the signature is the whole of its security.
// Nothing is read out of the body until the body has been proved to come from
// Lemon Squeezy.
export const dynamic = 'force-dynamic'

// Events that describe the state of a subscription. Lemon Squeezy sends order
// events too, but an order is a moment and a subscription is the thing that
// grants a tier, so the tier follows the subscription and nothing else.
const HANDLED = new Set([
  'subscription_created',
  'subscription_updated',
  'subscription_cancelled',
  'subscription_resumed',
  'subscription_paused',
  'subscription_unpaused',
  'subscription_expired'
])

export async function POST (req) {
  if (!canReceiveWebhooks()) {
    // Not configured. A 503 makes the provider retry later rather than treating
    // it as delivered and dropping it.
    return Response.json({ error: 'Billing is not configured.' }, { status: 503 })
  }

  // The raw text, not req.json(). The digest is over the bytes that were sent,
  // and re-serialising the parsed object changes them.
  const raw = await req.text()
  const signature = req.headers.get('x-signature')

  if (!validSignature(raw, signature, billing().webhookSecret)) {
    return Response.json({ error: 'Bad signature.' }, { status: 401 })
  }

  let payload
  try { payload = JSON.parse(raw) } catch {
    return Response.json({ error: 'Bad body.' }, { status: 400 })
  }

  const event = String(payload?.meta?.event_name ?? '')
  // Anything else is acknowledged rather than refused. A 4xx makes Lemon
  // Squeezy retry an event this app is never going to want.
  if (!HANDLED.has(event)) return Response.json({ ok: true, ignored: event })

  const update = subscriptionUpdate(payload)
  if (!update) {
    console.warn('lemonsqueezy: unknown variant', payload?.data?.attributes?.variant_id)
    return Response.json({ ok: true, ignored: 'unknown variant' })
  }

  // By subscription id first. A renewal for a subscription this app already
  // knows about belongs to the account that bought it, whatever address the
  // provider now has on it.
  let profile = update.subscriptionId
    ? await getProfileBySubscription(update.subscriptionId)
    : null

  if (!profile) {
    const email = emailFor(payload)
    profile = email ? await getProfile(email) : null
    if (!profile) {
      // Acknowledged, because retrying will not conjure an account. Logged,
      // because it means somebody has paid and is not getting what they bought.
      console.error('lemonsqueezy: paid subscription with no matching account',
        { event, email, subscription: update.subscriptionId })
      return Response.json({ ok: true, ignored: 'no account' })
    }
  }

  await setSubscription(profile.email, update)
  return Response.json({ ok: true, tier: update.tier })
}
