import Link from 'next/link'
import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { buildBoardExport } from '@/lib/export/board-build'
import BoardExporter from '@/components/app/BoardExporter'

export const metadata = { title: 'Export the leaderboard' }
export const dynamic = 'force-dynamic'

export default async function BoardExportPage () {
  const session = await auth()
  if (!session?.user) redirect('/')
  const data = await buildBoardExport(session.user.email)

  if (!data) {
    return (
      <>
        <div className="page-head"><h1>Nothing to rank yet</h1></div>
        <div className="soon-panel">
          <p>Rate a few albums and the leaderboard can be exported.</p>
          <Link className="btn-ghost" href="/app">Find an album</Link>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="page-head exp-head">
        <div>
          <h1>Export the leaderboard</h1>
          <p>{data.total} albums, {data.pages.length} pages</p>
        </div>
        <Link className="btn-ghost" href="/app/board">Back to the board</Link>
      </div>
      <BoardExporter data={data} paid={session.user.role === 'owner'} />
    </>
  )
}
