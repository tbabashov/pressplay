import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { buildExport } from '@/lib/export/build'
import Exporter from '@/components/app/Exporter'
import { param } from '@/lib/route-param'
import { getProfile, recordGeneration, countGenerationsToday, generatedToday } from '@/lib/db'
import { accountTier, limitsFor } from '@/lib/tiers'
import OutOfRecords from '@/components/app/OutOfRecords'

export const metadata = { title: 'Export' }
export const dynamic = 'force-dynamic'

export default async function ExportPage ({ params }) {
  const id = param((await params).id)
  const session = await auth()
  if (!session?.user) redirect('/')

  const [data, profile] = await Promise.all([
    buildExport(session.user.email, id),
    getProfile(session.user.email)
  ])
  const tier = accountTier(session, profile)

  // The day's allowance is spent on building a record's slides, not on
  // downloading them. Pressing Build the slides is the moment someone decided
  // to make a post out of a record; whether they then save one image or six,
  // or come back tomorrow to save another, is not a second record. Building
  // the same album again on the same day is free for the same reason.
  const cap = limitsFor(tier).generationsPerDay
  let quota = null
  if (data && cap !== Infinity) {
    const email = session.user.email
    if (!(await generatedToday(email, id))) {
      const used = await countGenerationsToday(email)
      if (used >= cap) quota = { tier, used, limit: cap }
      else await recordGeneration(email, id)
    }
  }

  if (quota) {
    return <OutOfRecords tier={quota.tier} used={quota.used} limit={quota.limit} albumId={id} />
  }

  if (!data) {
    return (
      <>
        <div className="page-head"><h1>Nothing to export yet</h1></div>
        <div className="soon-panel">
          <p>Save a rating for this album first, then its slides can be built.</p>
          <Link className="btn-ghost" href={`/app/rate/${id}`}>Back to the rating</Link>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="page-head exp-head">
        <div>
          <h1>{data.review.album.name}</h1>
          <p>{data.review.album.artists?.[0] || 'Unknown artist'} · album #{data.albumNumber}</p>
        </div>
        <Link className="btn-ghost" href={`/app/rate/${id}`}>Back to the rating</Link>
      </div>
      <Exporter data={data} tier={tier} />
    </>
  )
}
