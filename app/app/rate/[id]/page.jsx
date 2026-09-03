import Link from 'next/link'
import { auth } from '@/auth'
import { getAlbum } from '@/lib/music'
import { getReview, getProfile, getPreferences } from '@/lib/db'
import { fromSnapshot, preferSaved } from '@/lib/album-shape'
import { param } from '@/lib/route-param'
import Rater from '@/components/app/Rater'
import PublishToggle from '@/components/social/PublishToggle'
import { normalisePreferences, DEFAULT_PREFERENCES } from '@/lib/preferences'

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
      <Rater album={album} initial={initial} canSave={!!session?.user} preferences={preferences} />
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
