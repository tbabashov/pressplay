import { Suspense } from 'react'
import { auth } from '@/auth'
import { getProfile } from '@/lib/db'
import { discover, followedFeed } from '@/lib/social-queries'
import { publicProfile } from '@/lib/profile'
import Social from '@/components/app/Social'

export const metadata = { title: 'Social' }
export const dynamic = 'force-dynamic'

const TABS = new Set(['recent', 'popular', 'following'])

export default async function Feed ({ searchParams }) {
  const session = await auth()
  if (!session?.user) return null

  const sp = await searchParams
  const tab = TABS.has(sp?.tab) ? sp.tab : 'recent'
  const email = session.user.email

  const [rows, me] = await Promise.all([
    tab === 'following'
      ? followedFeed({ viewerEmail: email })
      : discover({ sort: tab, viewerEmail: email }),
    getProfile(email)
  ])

  return (
    <>
      <div className="page-head">
        <h1>Social</h1>
        <p className="page-sub">
          What everyone has been rating. Vote a rating up or down, and open the replies to argue
          with the number.
        </p>
      </div>
      <Suspense fallback={null}>
        <Social
          rows={rows}
          tab={tab}
          viewer={me ? publicProfile(me) : null}
        />
      </Suspense>
    </>
  )
}
