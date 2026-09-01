import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { buildExport } from '@/lib/export/build'
import Exporter from '@/components/app/Exporter'
import { param } from '@/lib/route-param'

export const metadata = { title: 'Export' }
export const dynamic = 'force-dynamic'

export default async function ExportPage ({ params }) {
  const id = param((await params).id)
  const session = await auth()
  if (!session?.user) redirect('/')

  const data = await buildExport(session.user.email, id)
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
      <Exporter data={data} paid={session.user.role === 'owner'} />
    </>
  )
}
