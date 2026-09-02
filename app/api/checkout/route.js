import { auth } from '@/auth'
import { TIERS, TIER_DETAIL } from '@/lib/tiers'

// The one place a payment provider will be wired in. Everything upstream, the
// buttons on the landing page, the buttons in the subscription screen, already
// posts here and already handles being told there is nowhere to go yet, so
// switching billing on is a change to this file and nothing else.
export async function POST (req) {
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

  // No provider is connected. This is deliberately not a fake success: nothing
  // should ever tell someone they have paid when nothing took a payment.
  return Response.json({
    ready: false,
    tier,
    period,
    price: period === 'yearly' ? TIER_DETAIL[tier].yearly : TIER_DETAIL[tier].monthly,
    message: `Payments are not switched on yet, so ${TIER_DETAIL[tier].name} cannot be bought ` +
      'today. Nothing has been charged.'
  })
}
