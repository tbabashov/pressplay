import { auth } from '@/auth'
import { getProfile } from '@/lib/db'
import { accountTier } from '@/lib/tiers'
import { samePath } from '@/lib/route-param'
import TiersScreen from '@/components/TiersScreen'
import '../tiers.css'

export const metadata = { title: 'Tiers' }
export const dynamic = 'force-dynamic'

// Deliberately not under /app. This is not a page of the app with a sidebar
// down the left: it is where you are sent when something is not on your tier,
// and it should read as its own place with one way out.
export default async function TiersPage ({ searchParams }) {
  const session = await auth()
  const mine = session?.user ? accountTier(session, await getProfile(session.user.email)) : null
  // The upgrade row is on every screen of the app now, so closing has to go
  // back to the one it was pressed on. It used to be hard wired to /app, which
  // was right when the only way here was from the rating screen.
  const { from } = (await searchParams) || {}
  const fallback = session?.user ? '/app' : '/'
  return <main><TiersScreen mine={mine} closeHref={samePath(from, fallback)} /></main>
}
