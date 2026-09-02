import { auth } from '@/auth'
import { searchAlbums } from '@/lib/music'

export async function GET (req) {
  // Catalogue search carries no user data. In development it stays open so the
  // UI can be exercised without a session; in production it always requires one.
  if (process.env.NODE_ENV === 'production') {
    const session = await auth()
    if (!session?.user) return Response.json({ error: 'Sign in first.' }, { status: 401 })
  }

  const q = new URL(req.url).searchParams.get('q') || ''

  // no-store, explicitly. Without a cache-control header a browser is free to
  // apply its own heuristics to a GET, and one bad response then keeps being
  // served back from disk for that exact query no matter how many times the
  // page is reloaded. A search result is never worth re-reading from a cache.
  const headers = { 'cache-control': 'no-store, must-revalidate' }
  try {
    return Response.json({ results: await searchAlbums(q) }, { headers })
  } catch (e) {
    return Response.json({ error: e.message }, { status: 502, headers })
  }
}
