import Link from 'next/link'
import { auth } from '@/auth'
import { getPreferences, getProfile } from '@/lib/db'
import { normalisePreferences, DEFAULT_PREFERENCES } from '@/lib/preferences'
import { accountTier, limitsFor } from '@/lib/tiers'
import RatingModel from '@/components/app/RatingModel'

export const metadata = { title: 'Scoring' }
export const dynamic = 'force-dynamic'

// The rating model used to live at the bottom of the profile screen, which is
// somewhere nobody goes unless they want to change their picture. The whole
// point of the app is that the scale and the criteria are yours, so the thing
// that makes them yours gets its own place to be found.
export default async function Scoring () {
  const session = await auth()
  if (!session?.user) return null

  const [stored, profile] = await Promise.all([
    getPreferences(session.user.email),
    getProfile(session.user.email)
  ])
  const preferences = stored ? normalisePreferences(stored) : DEFAULT_PREFERENCES
  const limits = limitsFor(accountTier(session, profile))

  return (
    <>
      <div className="page-head">
        <h1>How you score</h1>
      </div>

      <p className="set-intro measure">
        The scale a song is given, what the album is judged on beside the song average,
        and the picks you hand out on every record. Change these and every album you rate
        from here on uses them. Albums you have already rated keep the model they were
        rated with. You can see it all working on{' '}
        <Link href="/app">the rating screen</Link>.
      </p>

      <RatingModel
        initial={preferences}
        can={{ scales: limits.customScales, criteria: limits.customCriteria }}
      />
    </>
  )
}
