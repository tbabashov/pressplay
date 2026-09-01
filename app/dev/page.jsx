// DEV-ONLY visual harness. Renders the app's chrome and screens without a
// session so headless screenshots can check layout. Returns 404 in production,
// and must be deleted before deploy along with /render.
import { notFound } from 'next/navigation'
import Rail from '@/components/app/Rail'
import Search from '@/components/app/Search'
import Rater from '@/components/app/Rater'
import { getAlbum } from '@/lib/music'
import { saveReview } from '@/lib/db'
import { buildExport } from '@/lib/export/build'
import Exporter from '@/components/app/Exporter'
import LibraryGrid from '@/components/app/LibraryGrid'
import { listReviews, getReview, getSnapshot } from '@/lib/db'
import { rank, withDeltas } from '@/lib/standings'
import Board from '@/components/app/Board'
import BoardExporter from '@/components/app/BoardExporter'
import { buildBoardExport } from '@/lib/export/board-build'
import { fromSnapshot } from '@/lib/album-shape'
import { projectReview } from '@/lib/library-shape'
import '../app.css'

const DEV_USER = 'dev@localhost'   // never a real account

// Seeds a review through the real store so the export path is exercised
// end to end, rather than against a hand-made object.
async function seedAndBuild (id) {
  // An imported album is already in the store with its own snapshot; only seed
  // when there is nothing there yet.
  const existing = await getReview(DEV_USER, String(id)) || await getReview('medicalbruh@gmail.com', String(id))
  if (existing) return buildExport(existing.userEmail, id)

  const album = await getAlbum(id)
  const scores = {}
  album.tracks.forEach((t, i) => { scores[t.id] = i % 7 === 3 ? 'skit' : [9, 11, 8, 7, 10, 6, 9, 8][i % 8] })
  await saveReview({
    userEmail: DEV_USER, albumId: String(id), albumName: album.name, artist: album.artist,
    cover: album.cover, year: album.year, scores,
    criteria: { lyricism: '9.4', production: '10', delivery: '8.8', albumExperience: '9', replayValue: '8.5' },
    selections: { bestSong: album.tracks[1]?.title, worstSong: album.tracks[4]?.title },
    nowPlaying: album.tracks[1]?.id, final: 9.2
  })
  return buildExport(DEV_USER, id)
}

export default async function DevPreview ({ searchParams }) {
  if (process.env.NODE_ENV === 'production') notFound()
  const { screen = 'search', id = '11054900' } = await searchParams
  const paidPreview = screen === 'export'   // 'exportfree' renders the free tier
  // Mirrors the real rate page: catalogue first, stored snapshot second.
  let album = null
  let initial = null
  if (screen === 'rate') {
    initial = await getReview('medicalbruh@gmail.com', String(id))
    try { album = await getAlbum(id) } catch { album = fromSnapshot(initial?.album) }
  }
  const exportData = (screen === 'export' || screen === 'exportfree') ? await seedAndBuild(id) : null
  const board = screen === 'board'
    ? withDeltas(rank((await listReviews('medicalbruh@gmail.com')).map(projectReview)),
                 await getSnapshot('medicalbruh@gmail.com'))
    : null
  const boardExport = screen === 'boardexport' ? await buildBoardExport('medicalbruh@gmail.com') : null
  const lib = screen === 'library' ? (await listReviews('medicalbruh@gmail.com')).map(projectReview) : null

  return (
    <div className="app">
      <header className="topbar">
        <span className="topbar-mark">
          <svg width="19" height="19" viewBox="0 0 18 18" aria-hidden="true">
            <circle cx="9" cy="9" r="8" fill="none" stroke="currentColor" strokeWidth="1.5" />
            <path d="M6.9 5.6v5.8l4.5-2.9z" fill="currentColor" />
          </svg>
          <strong>Press Play</strong>
        </span>
        <div className="topbar-end">
          <span className="chip-owner">Owner</span>
          <span className="topbar-who"><i aria-hidden="true">T</i>Turan</span>
          <span className="topbar-out">Sign out</span>
        </div>
      </header>
      <div className="app-body">
        <Rail />
        <main className="app-main">
          {boardExport
            ? <BoardExporter data={boardExport} />
            : board
            ? <><div className="page-head"><h1>Your leaderboard</h1></div><Board rows={board} snapshot={null} /></>
            : lib
            ? <><div className="page-head"><h1>Your library</h1></div><LibraryGrid reviews={lib} /></>
            : exportData
            ? <Exporter data={exportData} paid={paidPreview} />
            : album
              ? <Rater album={album} initial={initial} />
              : <><div className="page-head"><h1>What are you rating, Turan?</h1></div><Search /></>}
        </main>
      </div>
    </div>
  )
}
