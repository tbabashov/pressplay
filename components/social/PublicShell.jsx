import Link from 'next/link'
import { auth } from '@/auth'
import { getProfile } from '@/lib/db'
import Mark from '@/components/Mark'

// Public pages are read by people who may have no account, so the header sells
// nothing and offers two things: the way back to the front page, and the way
// in to your own.
export default async function PublicShell ({ children }) {
  const session = await auth()
  const me = session?.user ? await getProfile(session.user.email) : null

  // The mark means home, and home depends on whether you have one. Signed in it
  // goes where the app's own mark goes; signed out the front page is the only
  // home there is. Without this, opening your own profile and pressing the mark
  // put you back on the sales page you had already bought.
  const home = session?.user ? '/app' : '/'

  return (
    <div className="pub-shell">
      <header className="pub-top">
        <Link href={home} className="pub-mark">
          <Mark size={19} />
          <strong>Press Play</strong>
        </Link>

        <nav className="pub-nav">
          <Link href="/browse">Browse raters</Link>
          {me
            ? <>
                <Link href={`/u/${me.handle}`}>Your page</Link>
                <Link className="btn-primary pub-cta" href="/app">Open the app</Link>
              </>
            : <Link className="btn-primary pub-cta" href="/">Start rating</Link>}
        </nav>
      </header>

      <main className="pub-main">{children}</main>

      <footer className="pub-foot">
        <p>Press Play Rankings. An average is not an opinion.</p>
      </footer>
    </div>
  )
}
