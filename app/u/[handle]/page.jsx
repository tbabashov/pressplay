import Link from 'next/link'
import { notFound } from 'next/navigation'
import { auth } from '@/auth'
import { getProfileByHandle, isFollowing } from '@/lib/db'
import { raterPage } from '@/lib/social-queries'
import { param } from '@/lib/route-param'
import { monthYear } from '@/lib/when'
import { ratingColor } from '@/lib/rating-colors'
import FollowButton from '@/components/social/FollowButton'

export const dynamic = 'force-dynamic'

export async function generateMetadata ({ params }) {
  const handle = param((await params).handle)
  const profile = await getProfileByHandle(handle)
  if (!profile) return { title: 'No such rater' }
  const name = profile.name || profile.handle
  return {
    title: `${name}`,
    description: profile.bio || `Albums rated by ${name}, every song scored.`,
    openGraph: { title: `${name} on Press Play Rankings`, description: profile.bio || '' }
  }
}

const fmt = n => (typeof n === 'number' ? n.toFixed(2) : null)

export default async function RaterProfile ({ params }) {
  const handle = param((await params).handle)
  const profile = await getProfileByHandle(handle)
  if (!profile) notFound()

  const session = await auth()
  const viewerEmail = session?.user?.email
  const isMe = viewerEmail === profile.email

  const [page, following] = await Promise.all([
    raterPage(profile),
    viewerEmail && !isMe ? isFollowing(viewerEmail, profile.email) : false
  ])
  const { albums, stats } = page

  return (
    <>
      <header className="rp-head">
        {profile.image
          ? <img className="rp-pfp" src={profile.image} alt="" width="92" height="92" referrerPolicy="no-referrer" />
          : <span className="rp-pfp rp-pfp-blank" aria-hidden="true">
              {(profile.name || profile.handle)[0].toUpperCase()}
            </span>}

        <div className="rp-who">
          <h1 className="display">{profile.name || profile.handle}</h1>
          <p className="rp-handle">/u/{profile.handle}</p>
          {profile.bio && <p className="rp-bio measure">{profile.bio}</p>}
          <p className="rp-since">
            {page.followers} {page.followers === 1 ? 'follower' : 'followers'}
            <span className="rp-dot" aria-hidden="true">·</span>
            {page.following} following
            {monthYear(profile.createdAt) && <>
              <span className="rp-dot" aria-hidden="true">·</span>
              Rating since {monthYear(profile.createdAt)}
            </>}
          </p>
        </div>

        <div className="rp-act">
          {isMe
            ? <Link className="btn-ghost" href="/app/settings">Edit profile</Link>
            : <FollowButton handle={profile.handle} initial={following} signedIn={Boolean(viewerEmail)} />}
        </div>
      </header>

      {albums.length === 0 ? (
        <div className="rp-empty">
          <p>{isMe
            ? 'You have not published anything yet. Open a rating and publish it to give it a page.'
            : 'Nothing published yet.'}</p>
          {isMe && <Link className="btn-ghost" href="/app/library">Your library</Link>}
        </div>
      ) : (
        <>
          <dl className="rp-stats">
            <div><dt>Albums</dt><dd className="tnum">{stats.albums}</dd></div>
            <div><dt>Songs scored</dt><dd className="tnum">{stats.songs}</dd></div>
            <div><dt>Average</dt><dd className="tnum">{fmt(stats.average) ?? 'None'}</dd></div>
            <div><dt>Elevens given</dt><dd className="tnum">{stats.elevens}</dd></div>
          </dl>

          <h2 className="rp-h2 display">The leaderboard</h2>
          <ol className="rp-board glass-list">
            {albums.map(a => {
              const c = a.final === null ? null : ratingColor(a.final)
              return (
                <li key={a.albumId} className="rp-row">
                  <span className="rp-rank tnum">{a.rank}</span>
                  <Link className="rp-link" href={`/u/${profile.handle}/${encodeURIComponent(a.albumId)}`}>
                    {a.cover
                      ? <img className="rp-art" src={a.cover} alt="" loading="lazy" width="52" height="52" />
                      : <span className="rp-art rp-art-blank" aria-hidden="true" />}
                    <span className="rp-names">
                      <strong>{a.albumName || 'Untitled'}</strong>
                      <span className="rp-sub">
                        {a.artist}{a.year ? ` · ${a.year}` : ''}
                        {a.comments > 0 && ` · ${a.comments} ${a.comments === 1 ? 'reply' : 'replies'}`}
                      </span>
                    </span>
                    {c && (
                      <span className="rp-score tnum" style={{ background: c.bg, color: c.fg }}>
                        {a.final.toFixed(1)}
                      </span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ol>
        </>
      )}
    </>
  )
}
