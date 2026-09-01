import Link from 'next/link'
import { auth } from '@/auth'
import { listReviews } from '@/lib/db'
import LibraryGrid from '@/components/app/LibraryGrid'
import { projectReview } from '@/lib/library-shape'

export const metadata = { title: 'Library' }
export const dynamic = 'force-dynamic'

export default async function Library () {
  const session = await auth()
  const reviews = session?.user ? (await listReviews(session.user.email)).map(projectReview) : []

  return (
    <>
      <div className="page-head">
        <h1>Your library</h1>
      </div>

      {reviews.length === 0 ? (
        <div className="soon-panel">
          <p>Nothing rated yet. Score an album and it lands here with the number you gave it.</p>
          <Link className="btn-ghost" href="/app">Find an album</Link>
        </div>
      ) : (
        <LibraryGrid reviews={reviews} />
      )}
    </>
  )
}
