import { auth } from '@/auth'
import { searchAlbums } from '@/lib/music'

export async function GET (req) {
  const session = await auth()
  if (!session?.user) return Response.json({ error: 'Sign in first.' }, { status: 401 })

  const q = new URL(req.url).searchParams.get('q') || ''
  try {
    return Response.json({ results: await searchAlbums(q) })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 502 })
  }
}
