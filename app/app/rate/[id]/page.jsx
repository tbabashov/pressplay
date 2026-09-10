import Link from 'next/link'
import { auth } from '@/auth'
import { getAlbum } from '@/lib/music'
import { getReview, getProfile, getPreferences, countGenerationsToday, generatedToday } from '@/lib/db'
import { fromSnapshot, preferSaved } from '@/lib/album-shape'
import { param } from '@/lib/route-param'
import Rater from '@/components/app/Rater'
import PublishToggle from '@/components/social/PublishToggle'
import { normalisePreferences, DEFAULT_PREFERENCES } from '@/lib/preferences'
import { accountTier, limitsFor, canBuildSlides } from '@/lib/tiers'

export const dynamic = 'force-dynamic'

export async function generateMetadata ({ params }) {
  const id = param((await params).id)
  try {
    const a = await getAlbum(id)
    return { title: `${a.name} by ${a.artist}` }
  } catch { return { title: 'Rate an album' } }
}

export default async function RateAlbum ({ params }) {
  const id = param((await params).id)
  const session = await auth()
  const [initial, profile, storedPrefs] = session?.user
    ? await Promise.all([
        getReview(session.user.email, id),
        getProfile(session.user.email),
        getPreferences(session.user.email)
      ])
    : [null, null, null]
  const preferences = storedPrefs ? normalisePreferences(storedPrefs) : DEFAULT_PREFERENCES

  // Whether Build the slides has anywhere to go today. The export route decides
  // this for itself and refuses on its own — that is the check that counts, and
  // it stays — but until now the button said nothing, so the answer arrived as
  // a wall after a page load. Working it out here costs two queries the page is
  // already waiting on others for.
  //
  // An album already built today is still free to build again, which is why
  // this cannot be "used < limit" on its own: that would take the button away
  // from someone re-exporting a record they had already spent the day's
  // allowance on, and the export screen explicitly promises they can.
  let slides = null
  if (session?.user) {
    const cap = limitsFor(accountTier(session, profile)).generationsPerDay
    if (cap !== Infinity) {
      const [used, builtToday] = await Promise.all([
        countGenerationsToday(session.user.email),
        generatedToday(session.user.email, id)
      ])
      slides = { can: canBuildSlides({ cap, used, builtToday }), used, limit: cap }
    }
  }

  // What the rater saved wins. Reading the catalogue first and only falling
  // back to the snapshot meant every correction, a fixed track title, an added
  // feature, a renamed album, was written to the database and then thrown away
  // on the next page load, because the catalogue's version replaced it. The
  // catalogue is merged in behind it for the things a snapshot cannot carry.
  //
  // It is also how an imported review opens at all: the catalogue has never
  // heard of its id, so there is nothing to merge and the snapshot stands
  // alone.
  const catalogue = await getAlbum(id).catch(() => null)
  const album = preferSaved(fromSnapshot(initial?.album), catalogue)

  if (!album) {
    return (
      <div className="page-head">
        <h1>That album is not in the catalogue.</h1>
        <p className="notice">
          It may have been delisted since you last saw it.{' '}
          <Link href="/app">Search for another</Link>
        </p>
      </div>
    )
  }
  return (
    <>
      <Rater album={album} initial={initial} canSave={!!session?.user}
        preferences={preferences} slides={slides} />
      {initial && profile?.handle && (
        <PublishToggle
          albumId={id}
          initial={initial.published}
          href={`/u/${profile.handle}/${encodeURIComponent(id)}`}
        />
      )}
    </>
  )
}
