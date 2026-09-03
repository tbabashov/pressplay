import { Suspense } from 'react'
import { auth } from '@/auth'
import { getProfile } from '@/lib/db'
import Search from '@/components/app/Search'
import Suggestions from '@/components/app/Suggestions'
import { suggestionsFor } from '@/lib/suggestions'
import { listReviews } from '@/lib/db'
import wall from '@/lib/wall.json'

export default async function RatePage () {
  // The layout redirects when signed out, but layout and page render in
  // parallel, so this has to stand on its own.
  const session = await auth()

  // The name to greet by is the one on the profile, because that is the one
  // the settings screen changes. The session carries whatever the provider
  // handed over at sign in and does not move when the display name does, so
  // greeting from it kept calling people by their Google name for as long as
  // their token lasted. Whole name, not the first word: a display name is
  // chosen rather than given, and splitting "The Press Play" makes it "The".
  const profile = session?.user?.email ? await getProfile(session.user.email) : null
  const name = String(profile?.name || session?.user?.name || '').trim()

  // What to rate next. The seed is the day, so the strip is stable while you
  // are using it and different when you come back, without reshuffling on every
  // render and disagreeing between the server and the browser.
  const reviews = session?.user?.email ? await listReviews(session.user.email) : []
  const seed = Math.floor(Date.now() / 86400000)
  const suggested = await suggestionsFor(reviews, { limit: 12, seed, popular: wall })
    .catch(() => ({ kind: 'popular', items: [] }))

  return (
    <>
      <div className="page-head">
        <h1>{name ? `What are you rating, ${name}?` : 'What are you rating?'}</h1>
      </div>
      {/* Search reads the query string, which a client component may only do
          inside a boundary: without one the whole route opts out of static
          rendering and the build says so. */}
      <Suspense fallback={<div className="search" />}>
        <Search />
      </Suspense>
      <Suggestions kind={suggested.kind} items={suggested.items} />
    </>
  )
}
