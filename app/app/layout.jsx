import { redirect } from 'next/navigation'
import Link from 'next/link'
import { auth } from '@/auth'
import { getProfile } from '@/lib/db'
import { ensureProfile } from '@/lib/ensure-profile'
import Rail from '@/components/app/Rail'
import AccountMenu from '@/components/AccountMenu'
import Mark from '@/components/Mark'
import AchievementToasts from '@/components/app/AchievementToasts'
import '../app.css'
import '../tiers.css'

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
        {/* Into the app, not back to the landing page. Once somebody is signed
            in the mark means home, and home is the rating screen: every app
            that has both treats it this way. The landing page is still one URL
            away for anyone who wants it. */}
        <Link href="/app" className="topbar-mark">
          <Mark size={19} />
          <strong>Press Play</strong>
        </Link>

        <div className="topbar-end">
          {/* The profile is what someone edited; the session is what they
              signed in with and it never changes again. Reading the session
              here meant the name and picture in the bar stayed on whatever
              the account was called at sign up, however many times the profile
              was saved, which is exactly what "it says saved but nothing
              changes" looks like. */}
          <AccountMenu
            name={profile?.name || first || name}
            image={profile?.image || image}
            handle={profile?.handle}
            role={role}
          />
        </div>
      </header>

      <div className="app-body">
        <Rail image={profile?.image || image} name={profile?.name || name} />
        <main className="app-main">{children}</main>
      </div>

      <AchievementToasts />
    </div>
  )
}
