import { auth } from '@/auth'
import { getProfile } from '@/lib/db'
import { accountTier } from '@/lib/tiers'
import TiersScreen from '@/components/TiersScreen'
import '../tiers.css'

export const metadata = { title: 'Tiers' }
export const dynamic = 'force-dynamic'

// Deliberately not under /app. This is not a page of the app with a sidebar
// down the left: it is where you are sent when something is not on your tier,
// and it should read as its own place with one way out.
export default async function TiersPage () {
  const session = await auth()
  const mine = session?.user ? accountTier(session, await getProfile(session.user.email)) : null
  return <main><TiersScreen mine={mine} closeHref={session?.user ? '/app' : '/'} /></main>
}
