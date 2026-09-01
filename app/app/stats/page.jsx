import Link from 'next/link'
import { auth } from '@/auth'
import { listReviews } from '@/lib/db'
import { taste } from '@/lib/taste'
import { ratingColor, scoreText } from '@/lib/rating-colors'
import { TIERS } from '@/lib/rating-scale'

export const metadata = { title: 'Taste' }
export const dynamic = 'force-dynamic'

const TIER_NAME = Object.fromEntries(TIERS)
const fmt = (n, d = 2) => (typeof n === 'number' ? n.toFixed(d) : '—')

export default async function Stats () {
  const session = await auth()
  if (!session?.user) return null

  const t = taste(await listReviews(session.user.email))

  if (t.albums === 0) {
    return (
      <>
        <div className="page-head"><h1>Your taste</h1></div>
        <div className="soon-panel">
          <p>Rate a few albums and this fills in with what you actually reach for.</p>
          <Link className="btn-ghost" href="/app">Find an album</Link>
        </div>
      </>
    )
  }

  return (
    <>
      <div className="page-head"><h1>Your taste</h1></div>

      <dl className="ts-figures">
        <div><dt>Albums</dt><dd className="tnum">{t.albums}</dd></div>
        <div><dt>Songs scored</dt><dd className="tnum">{t.songs}</dd></div>
        <div><dt>Album average</dt><dd className="tnum">{fmt(t.average)}</dd></div>
        <div><dt>Elevens given</dt><dd className="tnum">{t.elevens}</dd></div>
      </dl>

      <section className="ts-block">
        <h2 className="ts-h2">Where your songs land</h2>
        <p className="ts-note">
          {t.songs} songs on the ladder, and {t.skits} marked N/A and kept out of every average.
          Your song average is {fmt(t.songAverage)}.
        </p>
        <ol className="ts-ladder">
          {[...t.buckets].reverse().map(b => {
            const c = ratingColor(b.score)
            return (
              <li key={b.score}>
                <span className="ts-tier tnum" style={{ color: c.bg.startsWith('#') ? c.bg : undefined }}>
                  {b.score}
                </span>
                <span className="ts-tier-name">{TIER_NAME[b.score]}</span>
                <span className="ts-bar">
                  <i style={{ width: `${(b.count / t.peak) * 100}%`, background: c.bg }} />
                </span>
                <span className="ts-count tnum">{b.count || ''}</span>
              </li>
            )
          })}
        </ol>
      </section>

      <div className="ts-split">
        <section className="ts-block">
          <h2 className="ts-h2">How you weigh the criteria</h2>
          {t.hardest && t.softest && t.hardest.key !== t.softest.key && (
            <p className="ts-note">
              You are hardest on {t.hardest.label.toLowerCase()} and softest on {t.softest.label.toLowerCase()}.
            </p>
          )}
          <ul className="ts-crit glass-list">
            {t.criteria.map(c => {
              const col = ratingColor(Math.round(c.avg))
              return (
                <li key={c.key}>
                  <span>{c.label}</span>
                  <span className="ts-crit-bar">
                    <i style={{ width: `${(c.avg / 11) * 100}%`, background: col.bg }} />
                  </span>
                  <span className="ts-chip tnum" style={{ background: col.bg, color: col.fg }}>
                    {fmt(c.avg, 1)}
                  </span>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="ts-block">
          <h2 className="ts-h2">The years you reach for</h2>
          <ul className="ts-decades glass-list">
            {t.decades.map(d => {
              const col = ratingColor(Math.round(d.avg))
              return (
                <li key={d.decade}>
                  <span className="tnum">{d.decade}s</span>
                  <span className="ts-crit-bar">
                    <i style={{ width: `${(d.albums / t.widest) * 100}%`, background: col.bg }} />
                  </span>
                  <span className="ts-decade-n tnum">{d.albums}</span>
                </li>
              )
            })}
          </ul>
        </section>
      </div>

      <section className="ts-block">
        <h2 className="ts-h2">Who you keep going back to</h2>
        <ul className="ts-artists glass-list">
          {t.artists.map(a => {
            const col = ratingColor(Math.round(a.avg))
            return (
              <li key={a.artist}>
                <strong>{a.artist}</strong>
                <span className="ts-artist-n">{a.albums} rated</span>
                <span className="ts-chip tnum" style={{ background: col.bg, color: col.fg }}>
                  {fmt(a.avg, 1)}
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      {t.best && (
        <p className="ts-best">
          Your highest is{' '}
          <Link href={`/app/rate/${encodeURIComponent(t.best.albumId)}`}>{t.best.albumName}</Link>{' '}
          by {t.best.artist}, at {fmt(t.best.final)}.
        </p>
      )}
    </>
  )
}
