import Link from 'next/link'
import { auth } from '@/auth'
import { listReviews, getSnapshot } from '@/lib/db'
import { rank, withDeltas } from '@/lib/standings'
import { projectReview } from '@/lib/library-shape'
import Board from '@/components/app/Board'
import AlbumTint from '@/components/app/AlbumTint'

export const metadata = { title: 'Leaderboard' }
export const dynamic = 'force-dynamic'

export default async function BoardPage () {
  const session = await auth()
  if (!session?.user) return null

  const [reviews, snapshot] = await Promise.all([
    listReviews(session.user.email),
    getSnapshot(session.user.email)
  ])
  const rows = withDeltas(rank(reviews.map(projectReview)), snapshot)

  return (
    <>
      <div className="page-head">
        <h1>Your leaderboard</h1>
      </div>
      {rows.length === 0 ? (
        <div className="soon-panel">
          <p>Rate something and it ranks itself here against everything else you have scored.</p>
          <Link className="btn-ghost" href="/app">Find an album</Link>
        </div>
      ) : (
        <>
          <AlbumTint cover={rows.find(r => r.cover)?.cover} />
          <Board rows={rows} snapshot={snapshot} />
        </>
      )}
    </>
  )
}
