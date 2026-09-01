import RenderFrames from '@/components/RenderFrames'

// Dev-only bridge: pulls a review out of the legacy API and renders the export
// frames inside Next, so slides can be produced without the old Vite server.
export const dynamic = 'force-dynamic'

const API = 'http://localhost:3001'

async function embed (url) {
  if (!url) return ''
  if (url.startsWith('data:')) return url
  const proxied = `${API}/api/img?url=${encodeURIComponent(url)}`
  const res = await fetch(proxied, { cache: 'no-store' })
  if (!res.ok) return ''
  const buf = Buffer.from(await res.arrayBuffer())
  const type = res.headers.get('content-type') || 'image/jpeg'
  return `data:${type};base64,${buf.toString('base64')}`
}

export default async function RenderPage ({ searchParams }) {
  const { album, token } = await searchParams
  if (!album || !token) return <pre style={{ color: '#fff', padding: 40 }}>need ?album=&token=</pre>

  const res = await fetch(`${API}/api/export/${encodeURIComponent(album)}`, {
    headers: { Authorization: `Bearer ${token}` }, cache: 'no-store'
  })
  if (!res.ok) return <pre style={{ color: '#fff', padding: 40 }}>API {res.status}</pre>
  const d = await res.json()

  d.review.album.coverProxied = await embed(d.review.album.cover)
  for (const e of d.ladder) if (!e.gap) e.coverProxied = await embed(e.album.coverSmall || e.album.cover)
  for (const g of d.discographies) for (const a of g.albums) a.cover = await embed(a.cover)

  return <RenderFrames data={d} />
}
