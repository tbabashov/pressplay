import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/auth'
import { getProfile } from '@/lib/db'
import { ensureProfile } from '@/lib/ensure-profile'
import Rail from '@/components/app/Rail'
import AccountMenu from '@/components/AccountMenu'
import '../app.css'

export const metadata = { title: 'Your library' }

export default async function AppLayout ({ children }) {
  const session = await auth()
  if (!session?.user) redirect('/join')
  const { name, image, role } = session.user
  const first = (name || '').split(' ')[0]

  // Accounts that signed in before profiles existed, and any whose bootstrap
  // failed at sign in, get one here rather than hitting a dead public link.
  const profile = (await getProfile(session.user.email).catch(() => null)) ||
    (await ensureProfile({ email: session.user.email, name, image }).catch(() => null))

  return (
    <div className="app">
      <header className="topbar">
        <Link href="/" className="topbar-mark">
          <svg width="19" height="19" viewBox="0 0 18 18" aria-hidden="true">
            <circle cx="9" cy="9" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M6.9 5.6v5.8l4.5-2.9z" fill="currentColor" />
          </svg>
          <strong>Press Play</strong>
        </Link>

        <div className="topbar-end">
          <AccountMenu name={first || name} image={image} handle={profile?.handle} role={role} />
        </div>
      </header>

      <div className="app-body">
        <Rail />
        <main className="app-main">{children}</main>
      </div>
    </div>
  )
}
