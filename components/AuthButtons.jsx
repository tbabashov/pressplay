import Link from 'next/link'
import { auth } from '@/auth'
import { getProfile } from '@/lib/db'
import AccountMenu from '@/components/AccountMenu'

const GoogleMark = ({ size = 16 }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#4285F4" d="M45.1 24.5c0-1.6-.1-2.8-.4-4H24v7.3h12.1c-.2 2-1.6 5-4.5 7l6.9 5.4c4.1-3.8 6.6-9.4 6.6-15.7z"/>
    <path fill="#34A853" d="M24 46c5.9 0 10.9-2 14.5-5.3l-6.9-5.4c-1.9 1.3-4.4 2.2-7.6 2.2-5.8 0-10.7-3.8-12.5-9.1l-7.1 5.5C8 41.3 15.4 46 24 46z"/>
    <path fill="#FBBC05" d="M11.5 28.4c-.5-1.4-.7-2.9-.7-4.4s.3-3 .7-4.4l-7.1-5.5C2.9 17 2 20.4 2 24s.9 7 2.4 9.9l7.1-5.5z"/>
    <path fill="#EA4335" d="M24 10.5c4.1 0 6.9 1.8 8.5 3.2l6.2-6C34.9 4.2 29.9 2 24 2 15.4 2 8 6.7 4.4 14.1l7.1 5.5c1.8-5.3 6.7-9.1 12.5-9.1z"/>
  </svg>
)

// Server actions rather than a client bundle: the button is a form submit, so
// it still works with JavaScript disabled.
export async function SignIn ({ large, label = 'Sign in' }) {
  const session = await auth()
  if (session?.user) return <Account session={session} />
  return (
    <Link href="/join" className={`btn-google${large ? ' btn-google-lg' : ''}`}>
      <GoogleMark size={large ? 19 : 16} />
      {large ? 'Sign in or make an account' : label}
    </Link>
  )
}

async function Account ({ session }) {
  const { name, image, role, email } = session.user
  const profile = await getProfile(email).catch(() => null)
  return (
    <AccountMenu
      name={(name || '').split(' ')[0] || name}
      image={image}
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
