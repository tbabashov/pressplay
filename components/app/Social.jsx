'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { ratingColor } from '@/lib/rating-colors'
import Comments from '@/components/social/Comments'

const TABS = [
  ['recent', 'Recent'],
  ['popular', 'Popular'],
  ['following', 'Following']
]

function Arrow ({ up }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true"
      style={up ? undefined : { transform: 'rotate(180deg)' }}>
      <path d="M12 5.5 20 15H4z" fill="currentColor" />
    </svg>
  )
}

// Up, down, and the running total between them. The count shown is the score
// rather than the raw ups, because a rating people disagreed about should not
// read the same as one nobody voted on.
function Votes ({ row, onVote, mine }) {
  const cast = v => onVote(row, row.myVote === v ? 0 : v)
  return (
    <div className={`sc-votes${mine ? ' sc-votes-own' : ''}`}>
      <button
        className={`sc-vote${row.myVote === 1 ? ' on' : ''}`}
        onClick={() => cast(1)} disabled={mine}
        aria-pressed={row.myVote === 1}
        aria-label={`Upvote ${row.albumName}`}
        title={mine ? 'This one is yours' : 'Upvote'}
      ><Arrow up /></button>
      <b className="tnum">{row.votes.score}</b>
      <button
        className={`sc-vote${row.myVote === -1 ? ' on down' : ''}`}
        onClick={() => cast(-1)} disabled={mine}
        aria-pressed={row.myVote === -1}
        aria-label={`Downvote ${row.albumName}`}
        title={mine ? 'This one is yours' : 'Downvote'}
      ><Arrow /></button>
    </div>
  )
}

export default function Social ({ rows: initial, tab, viewer }) {
  const [rows, setRows] = useState(initial)
  const [open, setOpen] = useState(null)      // the row whose thread is showing
  const [thread, setThread] = useState(null)  // its comments, once fetched
  const [error, setError] = useState('')
  const router = useRouter()
  const params = useSearchParams()

  // A tab change reloads the list from the server, so the rows in state have to
  // be replaced rather than kept: without this, switching to Popular left the
  // Recent rows on screen under the new heading.
  useEffect(() => { setRows(initial); setOpen(null); setThread(null) }, [initial])

  const vote = async (row, value) => {
    setError('')
    const before = rows
    // Answer the click now and reconcile with the server after. A vote that
    // waits on a round trip feels broken on a list this long.
    setRows(list => list.map(r => {
      if (r.id !== row.id) return r
      const delta = value - r.myVote
      return {
        ...r,
        myVote: value,
        votes: {
          up: r.votes.up + (value === 1 ? 1 : 0) - (r.myVote === 1 ? 1 : 0),
          down: r.votes.down + (value === -1 ? 1 : 0) - (r.myVote === -1 ? 1 : 0),
          score: r.votes.score + delta
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

  const openThread = async row => {
    if (open?.id === row.id) { setOpen(null); setThread(null); return }
    setOpen(row); setThread(null); setError('')
    try {
      const res = await fetch(
        `/api/comments?handle=${encodeURIComponent(row.by.handle)}&albumId=${encodeURIComponent(row.albumId)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not load the replies.')
      setThread(data.comments)
    } catch (e) { setError(e.message) }
  }

  // Replying in the pane has to move the number on the row that opened it.
  // Two things keep this from looping: the callback is stable for as long as
  // one thread is open, and an unchanged count returns the very same array.
  // The thread reports its length from an effect that lists this function in
  // its dependencies, so a new function each render, or a new array each call,
  // would re-run the effect forever.
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
          <ul className="sc-list glass-list">
            {rows.map(row => {
              const c = row.final === null ? null : ratingColor(Math.round(row.final), row.scaleModel)
              const mine = viewer?.handle && row.by.handle === viewer.handle
              return (
                <li key={row.id} className={`sc-row${open?.id === row.id ? ' on' : ''}`}>
                  <Votes row={row} onVote={vote} mine={mine} />
                  <Link
                    href={`/u/${row.by.handle}/${encodeURIComponent(row.albumId)}`}
                    className="sc-main"
                  >
                    {row.cover
                      ? <img className="sc-art" src={row.cover} alt="" loading="lazy" width="52" height="52" />
                      : <span className="sc-art sc-art-blank" aria-hidden="true" />}
                    <span className="sc-names">
                      <strong>{row.albumName}</strong>
                      <span className="sc-sub">{row.artist}</span>
                      <span className="sc-by">{row.by.name}</span>
                    </span>
                  </Link>
                  {c && (
                    <span className="sc-score tnum" style={{ background: c.bg, color: c.fg }}>
                      {row.final.toFixed(1)}
                    </span>
                  )}
                  <button
                    className={`sc-talk${open?.id === row.id ? ' on' : ''}`}
                    onClick={() => openThread(row)}
                    aria-expanded={open?.id === row.id}
                    aria-label={`Replies on ${row.albumName}`}
                  >
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M4 5.5h16v11H9l-5 4z" fill="none" stroke="currentColor"
                        strokeWidth="1.9" strokeLinejoin="round" />
                    </svg>
                    <em className="tnum">{row.comments}</em>
                  </button>
                </li>
              )
            })}
          </ul>

          {open && (
            <aside className="sc-pane">
              <header className="sc-pane-head">
                <div>
                  <strong>{open.albumName}</strong>
                  <span>{open.artist} · rated by {open.by.name}</span>
                </div>
                <button className="sc-pane-x" onClick={() => { setOpen(null); setThread(null) }}
                  aria-label="Close the replies">
                  <svg viewBox="0 0 24 24"><path d="M6.5 6.5l11 11m0-11l-11 11" fill="none"
                    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
                </button>
              </header>
              {thread === null
                ? <p className="sc-pane-wait">Loading the replies…</p>
                : <Comments key={open.id} handle={open.by.handle} albumId={open.albumId}
                    initial={thread} viewer={viewer}
                    onCount={countFor} />}
            </aside>
          )}
        </div>
      )}
    </>
  )
}
