import Link from 'next/link'
import { auth } from '@/auth'
import { getProfile, listReviews, getPreferences } from '@/lib/db'
import { ensureProfile } from '@/lib/ensure-profile'
import { published } from '@/lib/social-queries'
import { normalisePreferences, DEFAULT_PREFERENCES } from '@/lib/preferences'
import ProfileForm from '@/components/social/ProfileForm'
import RatingModel from '@/components/app/RatingModel'

export const metadata = { title: 'Profile' }
export const dynamic = 'force-dynamic'

export default async function Settings () {
  const session = await auth()
  if (!session?.user) return null

  // Bootstrapping happens at sign in. Repeating it here covers the account that
  // signed in before profiles existed, and the one whose first attempt failed.
  const profile = (await getProfile(session.user.email)) ||
    (await ensureProfile({
      email: session.user.email, name: session.user.name, image: session.user.image
    }))

  if (!profile) {
    return (
      <div className="soon-panel">
        <p>Your profile could not be set up. Reload the page and it will try again.</p>
      </div>
    )
  }

  const [all, storedPrefs] = await Promise.all([
    listReviews(session.user.email),
    getPreferences(session.user.email)
  ])
  const live = published(all)
  const preferences = storedPrefs ? normalisePreferences(storedPrefs) : DEFAULT_PREFERENCES

  return (
    <>
      <div className="page-head">
        <h1>Your profile</h1>
      </div>

      <p className="set-intro measure">
        This is what other people see. Your ratings stay private until you publish
        them one by one.
      </p>

      <ProfileForm profile={{
        handle: profile.handle, name: profile.name || '', bio: profile.bio || '',
        image: profile.image || null
      }} />

      <hr className="set-rule" />

      <div className="page-head set-head">
        <h1>Your rating model</h1>
      </div>
      <RatingModel initial={preferences} />

      <div className="set-counts">
        <p>
          <strong className="tnum">{live.length}</strong> published
          <span className="rp-dot" aria-hidden="true">·</span>
          <strong className="tnum">{all.length - live.length}</strong> private
        </p>
        <Link className="btn-ghost" href="/app/library">Publish from your library</Link>
      </div>
    </>
  )
}
