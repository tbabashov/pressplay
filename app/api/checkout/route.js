import { auth } from '@/auth'
import { TIERS, TIER_DETAIL } from '@/lib/tiers'
import { billing, canSell, LEMON_API } from '@/lib/billing'
import { SITE_URL } from '@/lib/site-url'
import { limit, callerKey } from '@/lib/rate-limit'

// The one place a payment provider is wired in. Everything upstream, the
// buttons on the landing page and the buttons in the subscription screen,
// already posts here and already handles being told there is nowhere to go yet.
export async function POST (req) {
  const stop = limit(callerKey(req, 'checkout'), { max: 20, windowMs: 10 * 60 * 1000 })
  if (stop) return stop

  const session = await auth()

  let body
  try { body = await req.json() } catch { body = {} }
  const tier = TIERS.includes(body?.tier) ? body.tier : null
  const period = body?.period === 'yearly' ? 'yearly' : 'monthly'
  if (!tier || tier === 'free') {
    return Response.json({ error: 'Which tier?' }, { status: 400 })
  }

  if (!session?.user) {
    // Signing in first, then coming back to the same choice.
    return Response.json({
      ready: false,
      signIn: `/join?next=${encodeURIComponent(`/tiers?tier=${tier}&period=${period}`)}`,
      message: 'Sign in first, then pick a tier.'
    })
  }

  // Not configured. Deliberately not a fake success: nothing should ever tell
  // someone they have paid when nothing took a payment.
  if (!canSell(tier, period)) {
    return Response.json({
      ready: false,
      tier,
      period,
      price: period === 'yearly' ? TIER_DETAIL[tier].yearly : TIER_DETAIL[tier].monthly,
      message: `Payments are not switched on yet, so ${TIER_DETAIL[tier].name} cannot be bought ` +
        'today. Nothing has been charged.'
    })
  }

  const conf = billing()
  const email = session.user.email

  let res
  try {
    res = await fetch(`${LEMON_API}/checkouts`, {
      method: 'POST',
      headers: {
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
        Authorization: `Bearer ${conf.apiKey}`
      },
      body: JSON.stringify({
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: {
              email,
              // Comes back on every webhook for this subscription. The email on
              // the order is whatever was typed at the till, so the account this
              // belongs to has to travel with it rather than be inferred.
              // Lemon Squeezy only carries custom values through as strings.
              custom: { email: String(email), tier: String(tier), period: String(period) }
            },
            product_options: {
              redirect_url: `${SITE_URL}/app?upgraded=${tier}`,
              // The subscription is the product; there is nothing to return to
              // the store for.
              enabled_variants: [Number(conf.variants[tier][period])]
            }
          },
          relationships: {
            store: { data: { type: 'stores', id: String(conf.storeId) } },
            variant: { data: { type: 'variants', id: String(conf.variants[tier][period]) } }
          }
        }
      })
    })
  } catch {
    return Response.json({
      ready: false,
      message: 'The payment provider did not answer. Nothing has been charged.'
    }, { status: 502 })
  }

  const text = await res.text().catch(() => '')
  let json = null
  if (text) { try { json = JSON.parse(text) } catch { /* not JSON */ } }

  const url = json?.data?.attributes?.url
  if (!res.ok || !url) {
    // The provider's own message is far more useful than a generic failure, but
    // it is for the log: it can name internal ids, and it is not the buyer's
    // problem to read.
    console.error('lemonsqueezy checkout failed', res.status, text.slice(0, 500))
    return Response.json({
      ready: false,
      message: 'That checkout could not be opened. Nothing has been charged.'
    }, { status: 502 })
  }

  return Response.json({ ready: true, url, tier, period })
}
