import Link from 'next/link'
import Verified from '@/components/Verified'
import { auth } from '@/auth'
import { raters } from '@/lib/social-queries'
import { ratingColor } from '@/lib/rating-colors'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'Browse raters',
  description: 'People publishing album ratings with every song scored and the criteria shown.'
}

export default async function Browse () {
  const session = await auth()
  const rows = await raters({ excludeEmail: session?.user?.email })

  return (
    <>
      <header className="br-head">
        <h1 className="display">Who else is rating</h1>
        <p className="measure">
          Every album here was scored song by song by one person who put their name on it.
          Open a rating to see the working, then argue with it.
        </p>
      </header>

      {rows.length === 0 ? (
        <div className="rp-empty">
          <p>Nobody has published a rating yet. Be the first.</p>
          <Link className="btn-primary" href="/app">Rate an album</Link>
        </div>
      ) : (
        <ul className="br-list">
          {rows.map(({ profile, stats, top }) => (
            <li key={profile.handle} className="br-card">
              <Link href={`/u/${profile.handle}`} className="br-who">
                {profile.image
                  ? <img className="br-pfp" src={profile.image} alt="" width="46" height="46" referrerPolicy="no-referrer" />
                  : <span className="br-pfp br-pfp-blank" aria-hidden="true">
                      {(profile.name || profile.handle)[0].toUpperCase()}
                    </span>}
                <span className="br-names">
                  <strong>
                    {profile.name}
                    {profile.verified && <Verified label={`${profile.name} is verified`} />}
                  </strong>
                  <span className="br-handle">/u/{profile.handle}</span>
                </span>
              </Link>

              {profile.bio && <p className="br-bio">{profile.bio}</p>}

              <p className="br-stats tnum">
                {stats.albums} {stats.albums === 1 ? 'album' : 'albums'}
                <span className="rp-dot" aria-hidden="true">·</span>
                {stats.songs} songs
                {stats.average !== null && <>
                  <span className="rp-dot" aria-hidden="true">·</span>
                  {stats.average.toFixed(2)} average
                </>}
              </p>

              <ul className="br-top">
                {top.map(a => {
                  const c = a.final === null ? null : ratingColor(Math.round(a.final), a.scaleModel)
                  return (
                    <li key={a.albumId}>
                      <Link href={`/u/${profile.handle}/${encodeURIComponent(a.albumId)}`} title={`${a.albumName} by ${a.artist}`}>
                        {a.cover
                          ? <img src={a.cover} alt={a.albumName} loading="lazy" width="66" height="66" />
                          : <span className="br-blank" aria-hidden="true" />}
                        {c && (
                          <span className="br-score tnum" style={{ background: c.bg, color: c.fg }}>
                            {a.final.toFixed(1)}
                          </span>
                        )}
                      </Link>
                    </li>
                  )
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
