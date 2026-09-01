import { auth } from '@/auth'
import { listDiscography, listReviews, getPreferences } from '@/lib/db'
import { discographyByName } from '@/lib/music'
import { normalisePreferences } from '@/lib/preferences'
import Discography from '@/components/app/Discography'

export const metadata = { title: 'Discographies' }
export const dynamic = 'force-dynamic'

export default async function DiscographyPage () {
  const session = await auth()
  if (!session?.user) return null
  const [entries, reviews, prefs] = await Promise.all([
    listDiscography(session.user.email),
    listReviews(session.user.email),
    getPreferences(session.user.email)
  ])
  // Offer the artists already in the library, so names stay consistent.
  const artists = [...new Set(reviews.map(r => r.artist).filter(Boolean))].sort()

  // The catalogue half of each discography is pulled in here rather than left
  // to appear for the first time on a slide. It used to exist only at export
  // time, so the singles and stray EPs it hands back had nothing on this screen
  // to remove them with. Lookups are cached for the hour, so this is one round
  // trip per artist on a cold load and none after that.
  // An album you have actually rated reaches a slide through the review, not
  // through this list, so hiding it here would do nothing. It is marked rather
  // than given a remove button that quietly fails.
  const rated = reviews.map(r => ({ artist: r.artist || (r.artists || [])[0] || '', name: r.albumName || '' }))

  const catalogue = await Promise.all(
    artists.map(async a => ({ artist: a, albums: await discographyByName(a).catch(() => []) }))
  )

  return (
    <>
      <div className="page-head">
        <h1>Discographies</h1>
        <p className="page-sub">
          These are the albums each of your artists brings to a discography slide. The catalogue
          fills most of it in, so usually there is nothing to do here. Add one by hand when the
          catalogue is missing it, and remove anything you would rather not see on a slide.
        </p>
      </div>
      <Discography
        initial={entries}
        artists={artists}
        catalogue={catalogue}
        rated={rated}
        hidden={normalisePreferences(prefs).hiddenAlbums}
      />
    </>
  )
}
