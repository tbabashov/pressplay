import { auth } from '@/auth'
import { listDiscography, saveDiscographyEntry } from '@/lib/db'

export async function GET () {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Sign in first.' }, { status: 401 })
  return Response.json({ entries: await listDiscography(session.user.email) })
}

export async function POST (req) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Sign in first.' }, { status: 401 })
  const body = await req.json().catch(() => null)
  if (!body?.name?.trim()) return Response.json({ error: 'An album needs a name.' }, { status: 400 })
  const artists = (body.artists || []).map(a => String(a).trim()).filter(Boolean)
  if (!artists.length) return Response.json({ error: 'Credit at least one artist.' }, { status: 400 })

  return Response.json({
    entry: await saveDiscographyEntry(session.user.email, {
      id: body.id, name: body.name.trim(), year: body.year?.trim() || null,
      cover: body.cover?.trim() || null, artists
    })
  })
}
