import { auth } from '@/auth'
import { getPreferences, savePreferences } from '@/lib/db'
import { normalisePreferences, DEFAULT_PREFERENCES } from '@/lib/preferences'

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

  // Whatever arrives is normalised before it is stored, so a bad list cannot
  // reach the rating screen and break scoring for every album at once.
  const preferences = normalisePreferences(body)
  await savePreferences(session.user.email, preferences)
  return Response.json({ preferences })
}
