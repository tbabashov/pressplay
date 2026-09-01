import { auth } from '@/auth'
import { listDiscography, listReviews } from '@/lib/db'
import Discography from '@/components/app/Discography'

export const metadata = { title: 'Discographies' }
export const dynamic = 'force-dynamic'

export default async function DiscographyPage () {
  const session = await auth()
  if (!session?.user) return null
  const [entries, reviews] = await Promise.all([
    listDiscography(session.user.email),
    listReviews(session.user.email)
  ])
  // Offer the artists already in the library, so names stay consistent.
  const artists = [...new Set(reviews.map(r => r.artist).filter(Boolean))].sort()

  return (
    <>
      <div className="page-head">
        <h1>Discographies</h1>
        <p className="page-sub">
          Discography slides fill themselves in from the catalogue, so most of the time there is
          nothing to do here. Add an album by hand when the catalogue is missing one. Credit
          several artists and it appears in each of their lists.
        </p>
      </div>
      <Discography initial={entries} artists={artists} />
    </>
  )
}
