import Link from 'next/link'
import { auth } from '@/auth'
import { getProfile } from '@/lib/db'
import AccountMenu from '@/components/AccountMenu'

// Server actions rather than a client bundle: the button is a form submit, so
// it still works with JavaScript disabled.
export async function SignIn ({ large, label = 'Sign in' }) {
  const session = await auth()

  // Signed in, the bar needs a way into the app. Without one the only route
  // was the account menu, whose Profile row lands on settings, so somebody who
  // came back to rate an album arrived at their own preferences instead.
  //
  // Signed out there is deliberately no second button: it would point at /join,
  // which is where Sign in already goes.
  //
  // The chip sits first and the app button last, so the bar ends on the thing
  // it wants you to press and the arrow points out of it rather than back into
  // the row. Swapped here in the markup rather than with CSS order, so tabbing
  // through the bar follows what is on the screen.
  if (session?.user) {
    return (
      <>
        <Account session={session} />
        <Link href="/app" className="nav-app" aria-label="Open the app">
          <span className="nav-app-full">Open the app</span>
          <span className="nav-app-short">Open</span>
          <svg width="14" height="14" viewBox="0 0 15 15" fill="none" aria-hidden="true">
            <path d="M3 7.5h9m0 0L8.5 4M12 7.5 8.5 11" stroke="currentColor"
              strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      </>
    )
  }

  // No Google mark. This button leads to a page offering Google or an address
  // and a password, and a provider's logo on it reads as "this site needs a
  // Google account", which is not true and is a reason to leave.
  return (
    <Link href="/join" className={`btn-signin${large ? ' btn-signin-lg' : ''}`}>
      {large ? 'Sign in or make an account' : label}
    </Link>
  )
}

async function Account ({ session }) {
  const { name, image, role, email } = session.user
  const profile = await getProfile(email).catch(() => null)
  return (
    <AccountMenu
      // Same reason as the app shell: the profile is what was edited, the
      // session is what the account signed up with and never changes.
      name={profile?.name || (name || '').split(' ')[0] || name}
      image={profile?.image || image}
      handle={profile?.handle}
      role={role}
    />
  )
}

// The primary call to action. Signed out it starts the Google flow; signed in
// it stops asking and simply opens the app, so the closing section never turns
// into a second account widget.
export async function StartButton ({ large }) {
  const session = await auth()
  if (session?.user) {
    return (
      <a className={`btn-primary${large ? ' btn-primary-lg' : ''}`} href="/app">
        Open the app
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
          <path d="M3 7.5h9m0 0L8.5 4M12 7.5 8.5 11" stroke="currentColor"
            strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </a>
    )
  }
  return (
    <Link className={`btn-primary${large ? ' btn-primary-lg' : ''}`} href="/join">
      Start rating
      <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
        <path d="M3 7.5h9m0 0L8.5 4M12 7.5 8.5 11" stroke="currentColor"
          strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  )
}
