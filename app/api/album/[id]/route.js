import { auth } from '@/auth'
import { getAlbum } from '@/lib/music'
import { param } from '@/lib/route-param'

export async function GET (_req, { params }) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Sign in first.' }, { status: 401 })

  const id = param((await params).id)
  try {
    return Response.json(await getAlbum(id))
  } catch (e) {
    return Response.json({ error: e.message }, { status: 404 })
  }
}
