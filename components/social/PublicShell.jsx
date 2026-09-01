import Link from 'next/link'
import { auth } from '@/auth'
import { getProfile } from '@/lib/db'

// Public pages are read by people who may have no account, so the header sells
// nothing and offers two things: the way back to the front page, and the way
// in to your own.
export default async function PublicShell ({ children }) {
  const session = await auth()
  const me = session?.user ? await getProfile(session.user.email) : null

  return (
    <div className="pub-shell">
      <header className="pub-top">
        <Link href="/" className="pub-mark">
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <circle cx="9" cy="9" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M6.9 5.6v5.8l4.5-2.9z" fill="currentColor" />
          </svg>
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
