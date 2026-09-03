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
  // One entry per credit, not one per review. Keying a rated album to its first
  // artist alone is why a record by two people showed as rated on one of their
  // discographies and unrated on the other.
  const rated = reviews.flatMap(r => {
    const credits = (r.album?.artists?.length ? r.album.artists : [r.artist]).filter(Boolean)
    return credits.map(a => ({ artist: a, name: r.albumName || '' }))
  })

  const catalogue = await Promise.all(
    // Everything the artist has, singles and EPs included. This screen is
    // where you decide what belongs on a slide, and an entry you were never
    // shown is one you cannot turn off, which is how the stray singles ended
    // up on finished slides with nothing here to remove them.
    artists.map(async a => ({ artist: a, albums: await discographyByName(a, 60, true).catch(() => []) }))
  )

  return (
    <>
      <div className="page-head">
        <h1>Discographies</h1>
        <p className="page-sub">
          Everything the catalogue has for each of your artists, singles and EPs included. Use the
          eye to keep something off your discography slides, it stays here, and you can put it
          back. Add one by hand when the catalogue is missing it.
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
