import { auth } from '@/auth'
import { getProfile, recordGeneration, countGenerationsToday, generatedToday } from '@/lib/db'
import { accountTier, limitsFor, TIER_DETAIL } from '@/lib/tiers'

const state = async (email, tier) => {
  const cap = limitsFor(tier).generationsPerDay
  const used = await countGenerationsToday(email)
  return {
    tier,
    tierName: TIER_DETAIL[tier].name,
    used,
    // Infinity does not survive JSON, so an unlimited tier says so in a field
    // of its own rather than arriving as null and being read as zero.
    limit: cap === Infinity ? null : cap,
    unlimited: cap === Infinity,
    left: cap === Infinity ? null : Math.max(0, cap - used)
  }
}

// What is left today. Read by the account menu, so it is cheap and says
// nothing an account cannot already see about itself.
export async function GET () {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Sign in first.' }, { status: 401 })
  const email = session.user.email
  const tier = accountTier(session, await getProfile(email))
  return Response.json(await state(email, tier))
}

// Claim one, at the moment slides are actually produced. An album already
// generated today is free to produce again: the limit is about how much you
// put out, and re-exporting after fixing a typo is not putting out more.
export async function POST (req) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Sign in first.' }, { status: 401 })

  let body
  try { body = await req.json() } catch { return Response.json({ error: 'Bad request.' }, { status: 400 }) }
  if (!body?.albumId) return Response.json({ error: 'Which album?' }, { status: 400 })

  const email = session.user.email
  const tier = accountTier(session, await getProfile(email))
  const cap = limitsFor(tier).generationsPerDay
  const albumId = String(body.albumId)

  if (cap !== Infinity && !(await generatedToday(email, albumId))) {
    const used = await countGenerationsToday(email)
    if (used >= cap) {
      return Response.json({
        error: `That is ${cap} ${cap === 1 ? 'record' : 'records'} today.`,
        ...(await state(email, tier))
      }, { status: 429 })
    }
  }

  await recordGeneration(email, albumId)
  return Response.json(await state(email, tier))
}
