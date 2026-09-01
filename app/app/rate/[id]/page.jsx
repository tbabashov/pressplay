import Link from 'next/link'
import { auth } from '@/auth'
import { getAlbum } from '@/lib/music'
import { getReview, getProfile, getPreferences } from '@/lib/db'
import { fromSnapshot } from '@/lib/album-shape'
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

  // An imported review has its own snapshot, so it opens even though the
  // catalogue has never heard of its id.
  let album = null
  try {
    album = await getAlbum(id)
  } catch {
    album = fromSnapshot(initial?.album)
  }

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
