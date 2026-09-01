import { auth } from '@/auth'
import { getProfile, claimHandle, upsertProfile } from '@/lib/db'
import { ensureProfile } from '@/lib/ensure-profile'
import { handleError, slugify, clampBio, clampName } from '@/lib/profile'

export async function GET () {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Sign in first.' }, { status: 401 })
  return Response.json({ profile: await getProfile(session.user.email) })
}

export async function PATCH (req) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Sign in first.' }, { status: 401 })
  const email = session.user.email

  let body
  try { body = await req.json() } catch { return Response.json({ error: 'Bad request.' }, { status: 400 }) }

  // A profile has to exist before it can be patched: the handle column has no
  // default, so writing a name into a missing row would fail on the insert.
  await ensureProfile({ email, name: session.user.name, image: session.user.image })

  // The handle moves first and on its own. If it is taken, nothing else is
  // written either, so the form comes back exactly as it was sent.
  if (body.handle !== undefined) {
    const wanted = slugify(body.handle)
    const bad = handleError(wanted)
    if (bad) return Response.json({ error: bad, field: 'handle' }, { status: 400 })

    const current = await getProfile(email)
    if (current?.handle !== wanted) {
      const { ok } = await claimHandle(email, wanted)
      if (!ok) return Response.json({ error: 'That handle is taken.', field: 'handle' }, { status: 409 })
    }
  }

  const patch = {}
  if (body.name !== undefined) patch.name = clampName(body.name)
  if (body.bio !== undefined) patch.bio = clampBio(body.bio)

  const profile = Object.keys(patch).length
    ? await upsertProfile(email, patch)
    : await getProfile(email)

  return Response.json({ profile })
}
