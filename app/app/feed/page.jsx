import Link from 'next/link'
import { auth } from '@/auth'
import { feed } from '@/lib/social-queries'
import { ratingColor } from '@/lib/rating-colors'

export const metadata = { title: 'Following' }
export const dynamic = 'force-dynamic'

export default async function Feed () {
  const session = await auth()
  if (!session?.user) return null

  const items = await feed(session.user.email)

  return (
    <>
      <div className="page-head">
        <h1>Following</h1>
      </div>

      {items.length === 0 ? (
        <div className="soon-panel">
          <p>Nothing here yet. Follow someone and their published ratings land here.</p>
          <Link className="btn-ghost" href="/browse">Browse raters</Link>
        </div>
      ) : (
        <ul className="fd-list">
          {items.map(item => {
            const c = item.final === null ? null : ratingColor(item.final)
            return (
              <li key={`${item.by.handle}:${item.albumId}`} className="fd-item">
                <Link href={`/u/${item.by.handle}/${encodeURIComponent(item.albumId)}`} className="fd-link">
                  {item.cover
                    ? <img className="fd-art" src={item.cover} alt="" loading="lazy" width="58" height="58" />
                    : <span className="fd-art fd-art-blank" aria-hidden="true" />}
                  <span className="fd-names">
                    <strong>{item.albumName}</strong>
                    <span className="fd-sub">{item.artist}</span>
                    <span className="fd-by">Rated by {item.by.name}</span>
                  </span>
                  {c && (
                    <span className="fd-score tnum" style={{ background: c.bg, color: c.fg }}>
                      {item.final.toFixed(1)}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
