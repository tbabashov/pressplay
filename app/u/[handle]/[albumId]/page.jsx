import Link from 'next/link'
import { notFound } from 'next/navigation'
import { auth } from '@/auth'
import { getProfile, reviewId } from '@/lib/db'
import { resolvePublicReview } from '@/lib/public-review'
import { commentsFor } from '@/lib/social-queries'
import { publicReview } from '@/lib/social-shape'
import { param } from '@/lib/route-param'
import { fullDate } from '@/lib/when'
import { ratingColor, scoreText, fmtDuration } from '@/lib/rating-colors'
import Score from '@/components/Score'
import Comments from '@/components/social/Comments'

export const dynamic = 'force-dynamic'

export async function generateMetadata ({ params }) {
  const { handle, albumId } = await params
  const found = await resolvePublicReview(param(handle), param(albumId))
  if (!found) return { title: 'Not found' }
  const { profile, review } = found
  const name = profile.name || profile.handle
  const score = typeof review.final === 'number' ? review.final.toFixed(1) : null
  return {
    title: `${review.albumName} rated by ${name}`,
    description: score
      ? `${name} scored ${review.albumName} by ${review.artist} a ${score}. Every song rated.`
      : `${name} on ${review.albumName} by ${review.artist}.`,
    openGraph: {
      title: `${review.albumName} ${score ? `· ${score}` : ''}`.trim(),
      description: `Rated by ${name} on Press Play Rankings.`,
      images: review.cover ? [review.cover] : undefined
    }
  }
}

const SELECTIONS = [
  ['bestSong', 'Best song'],
  ['worstSong', 'Worst song'],
  ['mostUnderrated', 'Most underrated'],
  ['mostOverrated', 'Most overrated'],
  ['bestFeature', 'Best feature']
]

export default async function PublicReview ({ params }) {
  const { handle: rawHandle, albumId: rawAlbum } = await params
  const handle = param(rawHandle)
  const albumId = param(rawAlbum)

  const session = await auth()
  const found = await resolvePublicReview(handle, albumId, session?.user?.email)
  if (!found) notFound()

  const { profile, review, isOwner } = found
  const r = publicReview(review)

  const [comments, viewerProfile] = await Promise.all([
    review.published ? commentsFor(reviewId(profile.email, albumId)) : [],
    session?.user ? getProfile(session.user.email) : null
  ])

  const picks = SELECTIONS
    .map(([key, label]) => [label, r.selections[key]])
    .filter(([, value]) => value)

  return (
    <article className="pr">
      {!review.published && (
        <p className="pr-draft">
          This rating is private. Only you can see this page. Publish it from the
          rating screen to open it up.
        </p>
      )}

      <header className="pr-head">
        {r.cover
          ? <img className="pr-art" src={r.cover} alt={`${r.albumName} cover`} width="260" height="260" />
          : <span className="pr-art pr-art-blank" aria-hidden="true" />}

        <div className="pr-title">
          <p className="pr-by">
            Rated by{' '}
            <Link href={`/u/${profile.handle}`} className="pr-author">
              {profile.image && <img src={profile.image} alt="" width="22" height="22" referrerPolicy="no-referrer" />}
              {profile.name || profile.handle}
            </Link>
          </p>
          <h1 className="display">{r.albumName}</h1>
          <p className="pr-artist">{r.artist}{r.year ? ` · ${r.year}` : ''}</p>
          {r.final !== null && (
            <div className="pr-final">
              <Score value={r.final} size="xl" decimals={2} />
            </div>
          )}
          <p className="pr-when">
            {r.tracks.length} songs
            {r.runtimeMs ? ` · ${Math.round(r.runtimeMs / 60000)} minutes` : ''}
            {fullDate(r.updatedAt) ? ` · Updated ${fullDate(r.updatedAt)}` : ''}
          </p>
        </div>
      </header>

      {r.criteria.some(c => c.value !== null) && (
        <section className="pr-block">
          <h2 className="pr-h2">The criteria</h2>
          <dl className="pr-crit">
            {r.criteria.filter(c => c.value !== null).map(c => {
              const col = ratingColor(Math.round(c.value))
              return (
                <div key={c.key}>
                  <dt>{c.label}</dt>
                  <dd>
                    <span className="pr-crit-chip tnum" style={{ background: col.bg, color: col.fg }}>
                      {c.value.toFixed(1)}
                    </span>
                  </dd>
                </div>
              )
            })}
          </dl>
        </section>
      )}

      {picks.length > 0 && (
        <section className="pr-block">
          <h2 className="pr-h2">The picks</h2>
          <dl className="pr-picks">
            {picks.map(([label, value]) => (
              <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
            ))}
          </dl>
        </section>
      )}

      {r.tracks.length > 0 && (
        <section className="pr-block">
          <h2 className="pr-h2">Every song</h2>
          <ol className="pr-tracks glass-list">
            {r.tracks.map(t => {
              const c = ratingColor(t.score)
              return (
                <li key={t.id} className="pr-track">
                  <span className="pr-n tnum">{t.n}</span>
                  <span className="pr-name">
                    <strong>{t.title}</strong>
                    {t.features?.length > 0 && (
                      <span className="pr-ft">ft. {t.features.join(', ')}</span>
                    )}
                  </span>
                  {t.durationMs > 0 && (
                    <span className="pr-dur tnum">{fmtDuration(t.durationMs)}</span>
                  )}
                  <span
                    className="pr-chip tnum"
                    style={{ background: c.bg, color: c.fg, boxShadow: c.glow ? `0 0 26px ${c.glow}` : undefined }}
                  >
                    {scoreText(t.score)}
                  </span>
                </li>
              )
            })}
          </ol>
        </section>
      )}

      {review.published && (
        <Comments
          handle={profile.handle}
          albumId={albumId}
          initial={comments}
          viewer={viewerProfile
            ? { handle: viewerProfile.handle, name: viewerProfile.name || viewerProfile.handle, image: viewerProfile.image }
            : null}
          canModerate={isOwner}
        />
      )}
    </article>
  )
}
