import { auth } from '@/auth'
import { getPreferences, savePreferences, getProfile } from '@/lib/db'
import { normalisePreferences, DEFAULT_PREFERENCES, DEFAULT_CRITERIA } from '@/lib/preferences'
import { DEFAULT_SCALE } from '@/lib/scales'
import { accountTier, limitsFor } from '@/lib/tiers'

export async function GET () {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Sign in first.' }, { status: 401 })
  const stored = await getPreferences(session.user.email)
  return Response.json({ preferences: stored ? normalisePreferences(stored) : DEFAULT_PREFERENCES })
}

export async function PUT (req) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Sign in first.' }, { status: 401 })

  let body
  try { body = await req.json() } catch { return Response.json({ error: 'Bad request.' }, { status: 400 }) }

  // Only the keys actually sent are taken. A settings screen that PUTs its own
  // three fields would otherwise reset every key it does not know about, which
  // is how the hidden album list would vanish the next time anyone touched a
  // criterion. Whatever arrives is still normalised before it is stored, so a
  // bad list cannot reach the rating screen and break scoring for every album.
  const stored = await getPreferences(session.user.email)
  const base = stored ? normalisePreferences(stored) : DEFAULT_PREFERENCES
  const has = k => Object.prototype.hasOwnProperty.call(body ?? {}, k)
  const preferences = normalisePreferences({
    criteria: has('criteria') ? body.criteria : base.criteria,
    superlatives: has('superlatives') ? body.superlatives : base.superlatives,
    scale: has('scale') ? body.scale : base.scale,
    hiddenAlbums: has('hiddenAlbums') ? body.hiddenAlbums : base.hiddenAlbums,
    seenAchievements: has('seenAchievements') ? body.seenAchievements : base.seenAchievements
  })
  // Custom criteria and custom scales are what the paid tiers are for, so the
  // check has to be here and not only on the settings screen. A free account
  // that sends its own model keeps the built in one rather than being refused:
  // the rest of the save, the hidden album list included, still goes through.
  const limits = limitsFor(accountTier(session, await getProfile(session.user.email)))
  if (!limits.customCriteria) preferences.criteria = DEFAULT_CRITERIA
  if (!limits.customScales) preferences.scale = DEFAULT_SCALE

  await savePreferences(session.user.email, preferences)
  return Response.json({ preferences })
}
