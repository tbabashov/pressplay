import Link from 'next/link'
import { auth } from '@/auth'
import { getProfile, listReviews, getPreferences, countCommentsBy, voteTotals, listFollowers, reviewId } from '@/lib/db'
import { ensureProfile } from '@/lib/ensure-profile'
import { published } from '@/lib/social-queries'
import { normalisePreferences, DEFAULT_PREFERENCES } from '@/lib/preferences'
import ProfileForm from '@/components/social/ProfileForm'
import RatingModel from '@/components/app/RatingModel'
import { accountTier, TIER_DETAIL } from '@/lib/tiers'
import Achievements from '@/components/app/Achievements'
import DangerZone from '@/components/social/DangerZone'
import { achievementsFor } from '@/lib/achievements'

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
  const tier = accountTier(session, profile)

  // Counted off what is already stored. The only extra reads are the three
  // things a rating cannot tell you on its own: replies written, upvotes drawn,
  // and who is following.
  const email = session.user.email
  const ids = all.map(r => reviewId(email, r.albumId))
  const [commentsWritten, votes, followers] = await Promise.all([
    countCommentsBy(email), voteTotals(ids), listFollowers(email)
  ])
  const achievements = achievementsFor({
    reviews: all,
    commentsWritten,
    upvotes: Object.values(votes).reduce((n, v) => n + v.up, 0),
    followers: followers.length
  })
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

      <hr className="set-rule" />

      <div className="page-head set-head">
        <h1>Achievements</h1>
      </div>
      <Achievements list={achievements} bare />

      <hr className="set-rule" />

      <div className="page-head set-head">
        <h1>Your tier</h1>
      </div>
      <p className="set-intro measure">
        You are on <strong>{TIER_DETAIL[tier].name}</strong>. {TIER_DETAIL[tier].blurb}{' '}
        <Link href="/tiers">See what each tier includes</Link>.
      </p>

      <div className="set-counts">
        <p>
          <strong className="tnum">{live.length}</strong> published
          <span className="rp-dot" aria-hidden="true">·</span>
          <strong className="tnum">{all.length - live.length}</strong> private
        </p>
        <Link className="btn-ghost" href="/app/library">Publish from your library</Link>
      </div>

      <hr className="set-rule" />

      <DangerZone handle={profile.handle} />
    </>
  )
}
