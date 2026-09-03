'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { chipColour } from '@/lib/rating-colors'
import { ago } from '@/lib/when'
import Comments from '@/components/social/Comments'

const TABS = [
  ['recent', 'Recent'],
  ['popular', 'Popular'],
  ['following', 'Following']
]

const fmt = (n, d = 1) => (typeof n === 'number' ? n.toFixed(d) : '—')

// Relative times are the reader's clock, so they are filled in after mount.
// Rendering them on the server would mismatch, and be wrong for anyone outside
// the server's timezone.
function When ({ iso }) {
  const [text, setText] = useState('')
  useEffect(() => { setText(iso ? ago(iso) : '') }, [iso])
  return <span className="sc-when">{text}</span>
}

function Avatar ({ person, size = 34 }) {
  if (person?.image) {
    return <img className="sc-pfp" src={person.image} alt="" width={size} height={size}
      referrerPolicy="no-referrer" />
  }
  return (
    <span className="sc-pfp sc-pfp-blank" aria-hidden="true" style={{ width: size, height: size }}>
      {(person?.name || '?')[0].toUpperCase()}
    </span>
  )
}

function Arrow ({ up }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true"
      style={up ? undefined : { transform: 'rotate(180deg)' }}>
      <path d="M12 5.5 20 15H4z" fill="currentColor" />
    </svg>
  )
}

// Up, down, and the running total between them. The number shown is the score
// rather than the raw ups, because a rating people disagreed about should not
// read the same as one nobody voted on.
function Votes ({ row, onVote, mine }) {
  const cast = v => onVote(row, row.myVote === v ? 0 : v)
  return (
    <div className={`sc-votes${mine ? ' sc-votes-own' : ''}`}>
      <button className={`sc-vote${row.myVote === 1 ? ' on' : ''}`}
        onClick={() => cast(1)} disabled={mine} aria-pressed={row.myVote === 1}
        aria-label={`Upvote ${row.albumName}`}
        title={mine ? 'This one is yours' : 'Upvote'}><Arrow up /></button>
      <b className="tnum">{row.votes.score}</b>
      <button className={`sc-vote${row.myVote === -1 ? ' on down' : ''}`}
        onClick={() => cast(-1)} disabled={mine} aria-pressed={row.myVote === -1}
        aria-label={`Downvote ${row.albumName}`}
        title={mine ? 'This one is yours' : 'Downvote'}><Arrow /></button>
    </div>
  )
}

// The bars under a post. Each criterion keeps the colour of the rung it landed
// on, which is the same instrument the rest of the app reads scores with.
function CriteriaBars ({ criteria, scale, max = 11 }) {
  if (!criteria?.length) return null
  return (
    <ul className="sc-crit">
      {criteria.map(c => {
        const col = chipColour(Math.round(c.value), scale)
        return (
          <li key={c.key}>
            <span className="sc-crit-label">{c.label}</span>
            <span className="sc-crit-bar">
              <i style={{ width: `${Math.max(3, (c.value / max) * 100)}%`, background: col.bg }} />
            </span>
            <b className="tnum">{fmt(c.value)}</b>
          </li>
        )
      })}
    </ul>
  )
}

// The tracks, once a post has been opened. In album order, because a rating is
// about a record and not about a chart.
function TrackList ({ tracks, scale }) {
  if (!tracks?.length) return null
  return (
    <ol className="sc-tracks">
      {tracks.map(t => {
        const has = t.score !== null && t.score !== undefined
        const col = has ? chipColour(Math.round(t.score), scale) : null
        return (
          <li key={t.id}>
            <span className="sc-tn tnum">{t.n}</span>
            <span className="sc-tt">
              {t.title}
              {t.features?.length > 0 && <em> feat. {t.features.join(', ')}</em>}
            </span>
            {col
              ? <span className="sc-ts tnum" style={{ background: col.bg, color: col.fg }}>{fmt(t.score)}</span>
              : <span className="sc-ts sc-ts-none">—</span>}
          </li>
        )
      })}
    </ol>
  )
}

export default function Social ({ rows: initial, tab, viewer }) {
  const [rows, setRows] = useState(initial)
  const [open, setOpen] = useState(null)      // the post that is expanded
  const [detail, setDetail] = useState(null)  // its full review, once fetched
  const [thread, setThread] = useState(null)  // its comments, once fetched
  const [error, setError] = useState('')
  const router = useRouter()
  const params = useSearchParams()

  // A tab change reloads the list from the server, so the rows in state have to
  // be replaced rather than kept: without this, switching to Popular left the
  // Recent rows on screen under the new heading.
  useEffect(() => {
    setRows(initial); setOpen(null); setDetail(null); setThread(null)
  }, [initial])

  const vote = async (row, value) => {
    setError('')
    const before = rows
    // Answer the click now and reconcile with the server after. A vote that
    // waits on a round trip feels broken on a list this long.
    setRows(list => list.map(r => {
      if (r.id !== row.id) return r
      return {
        ...r,
        myVote: value,
        votes: {
          up: r.votes.up + (value === 1 ? 1 : 0) - (r.myVote === 1 ? 1 : 0),
          down: r.votes.down + (value === -1 ? 1 : 0) - (r.myVote === -1 ? 1 : 0),
          score: r.votes.score + (value - r.myVote)
        }
      }
    }))
    try {
      const res = await fetch('/api/votes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ handle: row.by.handle, albumId: row.albumId, value })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'That vote did not land.')
      setRows(list => list.map(r =>
        (r.id === row.id ? { ...r, votes: data.votes, myVote: data.myVote } : r)))
    } catch (e) {
      setRows(before)
      setError(e.message)
    }
  }

  // Opening a post fetches the two things a card does not carry: the tracks and
  // the argument. Both at once rather than one after the other, so the panel
  // fills in in one go.
  const openPost = async row => {
    if (open?.id === row.id) { setOpen(null); setDetail(null); setThread(null); return }
    setOpen(row); setDetail(null); setThread(null); setError('')
    const q = `handle=${encodeURIComponent(row.by.handle)}&albumId=${encodeURIComponent(row.albumId)}`
    const [rev, cmt] = await Promise.all([
      fetch(`/api/public-review?${q}`).then(r => r.json()).catch(() => null),
      fetch(`/api/comments?${q}`).then(r => r.json()).catch(() => null)
    ])
    if (rev?.review) setDetail(rev.review)
    else setError('Could not load that rating.')
    setThread(cmt?.comments || [])
  }

  const close = () => { setOpen(null); setDetail(null); setThread(null) }

  // Replying has to move the number on the post that opened the thread. The
  // callback is stable and an unchanged count returns the same array, because
  // the thread reports its length from an effect that lists this function in
  // its dependencies: a new function each render would loop forever.
  const openId = open?.id ?? null
  const countFor = useCallback(n => {
    if (!openId) return
    setRows(list => {
      const i = list.findIndex(r => r.id === openId)
      if (i === -1 || list[i].comments === n) return list
      const next = list.slice()
      next[i] = { ...next[i], comments: n }
      return next
    })
  }, [openId])

  const go = next => {
    const p = new URLSearchParams(params)
    p.set('tab', next)
    router.push(`/app/feed?${p}`)
  }

  const Post = ({ row }) => {
    const expanded = open?.id === row.id
    const c = row.final === null ? null : chipColour(Math.round(row.final), row.scaleModel)
    const mine = viewer?.handle && row.by.handle === viewer.handle
    const max = row.scaleModel?.max ?? 11
    return (
      <article className={`sc-post${expanded ? ' on' : ''}`}>
        <header className="sc-by">
          <Link href={`/u/${row.by.handle}`} className="sc-who">
            <Avatar person={row.by} />
            <span>
              <strong>{row.by.name}</strong>
              <em>@{row.by.handle}</em>
            </span>
          </Link>
          <When iso={row.updatedAt} />
        </header>

        <div className="sc-body">
          {row.cover
            ? <img className="sc-art" src={row.cover} alt="" loading="lazy" />
            : <span className="sc-art sc-art-blank" aria-hidden="true" />}
          <div className="sc-id">
            <h3>{row.albumName}</h3>
            <p className="sc-sub">{[row.artist, row.year].filter(Boolean).join(' · ')}</p>
            <p className="sc-facts">
              <span>{row.scored} of {row.songs} scored</span>
              {row.songAverage !== null && <span>{fmt(row.songAverage, 2)} song average</span>}
              {row.topMarks > 0 && <span className="sc-hot">{row.topMarks} top mark{row.topMarks > 1 ? 's' : ''}</span>}
              {row.skits > 0 && <span>{row.skits} skipped</span>}
            </p>
            {(row.bestSong || row.worstSong) && (
              <p className="sc-picks">
                {row.bestSong && <span><b>Best</b> {row.bestSong}</span>}
                {row.worstSong && <span><b>Worst</b> {row.worstSong}</span>}
              </p>
            )}
          </div>
          {c && (
            <span className="sc-score tnum" style={{ background: c.bg, color: c.fg,
              boxShadow: c.glow ? `0 0 40px ${c.glow}` : undefined }}>
              {row.final.toFixed(1)}
            </span>
          )}
        </div>

        <CriteriaBars criteria={row.criteria} scale={row.scaleModel} max={max} />

        <footer className="sc-acts">
          <Votes row={row} onVote={vote} mine={mine} />
          <button className={`sc-talk${expanded ? ' on' : ''}`} onClick={() => openPost(row)}
            aria-expanded={expanded}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 5.5h16v11H9l-5 4z" fill="none" stroke="currentColor"
                strokeWidth="1.9" strokeLinejoin="round" />
            </svg>
            {row.comments === 0 ? 'Reply' : `${row.comments} ${row.comments === 1 ? 'reply' : 'replies'}`}
          </button>
          <Link className="sc-open" href={`/u/${row.by.handle}/${encodeURIComponent(row.albumId)}`}>
            Full page
          </Link>
        </footer>
      </article>
    )
  }

  return (
    <>
      <div className="sc-tabs" role="tablist">
        {TABS.map(([key, label]) => (
          <button key={key} role="tab" aria-selected={tab === key}
            className={`chip${tab === key ? ' on' : ''}`} onClick={() => go(key)}>
            {label}
          </button>
        ))}
      </div>

      {error && <p className="notice notice-bad">{error}</p>}

      {rows.length === 0 ? (
        <div className="soon-panel">
          <p>
            {tab === 'following'
              ? 'Nobody you follow has published a rating yet.'
              : 'Nothing published yet. Publish one of your own and it shows up here.'}
          </p>
          <Link className="btn-ghost" href={tab === 'following' ? '/browse' : '/app/library'}>
            {tab === 'following' ? 'Find people to follow' : 'Go to your library'}
          </Link>
        </div>
      ) : (
        <div className={`sc-split${open ? ' is-open' : ''}`}>
          {/* An opened post leaves the feed and takes the left of the screen,
              with the argument about it alongside. The feed carries on
              underneath, so opening one does not lose your place in it. */}
          {open && (
            <section className="sc-stage">
              <div className="sc-stage-main">
                <button className="sc-stage-x" onClick={close} aria-label="Close">
                  <svg viewBox="0 0 24 24"><path d="M6.5 6.5l11 11m0-11l-11 11" fill="none"
                    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
                </button>
                <Post row={rows.find(r => r.id === open.id) || open} />
                {detail === null
                  ? <p className="sc-wait">Loading the rating…</p>
                  : <TrackList tracks={detail.tracks} scale={detail.scaleModel} />}
              </div>
              <aside className="sc-talkpane">
                {thread === null
                  ? <p className="sc-wait">Loading the replies…</p>
                  : <Comments key={open.id} handle={open.by.handle} albumId={open.albumId}
                      initial={thread} viewer={viewer} onCount={countFor} />}
              </aside>
            </section>
          )}

          <div className="sc-feed">
            {rows.filter(r => r.id !== open?.id).map(row => <Post key={row.id} row={row} />)}
          </div>
        </div>
      )}
    </>
  )
}
