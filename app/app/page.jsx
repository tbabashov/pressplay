import { auth } from '@/auth'
import { getProfile } from '@/lib/db'
import Search from '@/components/app/Search'

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

  return (
    <>
      <div className="page-head">
        <h1>{name ? `What are you rating, ${name}?` : 'What are you rating?'}</h1>
      </div>
      <Search />
    </>
  )
}
