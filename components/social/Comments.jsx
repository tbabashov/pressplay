'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Verified from '../Verified'
import { ago } from '@/lib/when'

const BODY_MAX = 1000

// Relative times are the reader's clock, so they are filled in after mount.
// Rendering them on the server would mismatch and, worse, be wrong for anyone
// outside the server's timezone.
function When ({ iso }) {
  const [text, setText] = useState('')
  useEffect(() => { setText(ago(iso)) }, [iso])
  return <time dateTime={iso} title={iso}>{text}</time>
}

function Avatar ({ person, size = 34 }) {
  if (person.image) {
    return <img className="cm-pfp" src={person.image} alt="" width={size} height={size}
      referrerPolicy="no-referrer" />
  }
  return (
    <span className="cm-pfp cm-pfp-blank" aria-hidden="true" style={{ width: size, height: size }}>
      {(person.name || '?')[0].toUpperCase()}
    </span>
  )
}

export default function Comments ({ handle, albumId, initial = [], viewer, canModerate, onCount }) {
  const [items, setItems] = useState(initial)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [removing, setRemoving] = useState(null)

  // The count lives outside this component on the social page, where it sits on
  // the row that opened the thread. Without this, replying left the row still
  // claiming no replies until the page was reloaded.
  useEffect(() => { onCount?.(items.length) }, [items.length, onCount])

  const submit = async e => {
    e.preventDefault()
    const body = text.trim()
    if (!body || busy) return
    setBusy(true); setError('')
    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ handle, albumId, body })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'That did not send.')
      setItems(list => [...list, data.comment])
      setText('')
    } catch (e) {
      setError(e.message)
    } finally { setBusy(false) }
  }

  const remove = async id => {
    setRemoving(id); setError('')
    const before = items
    setItems(list => list.filter(c => c.id !== id))
    try {
      const res = await fetch(`/api/comments/${encodeURIComponent(id)}`, { method: 'DELETE' })
      if (!res.ok) throw new Error((await res.json()).error || 'Could not remove it.')
    } catch (e) {
      setItems(before)
      setError(e.message)
    } finally { setRemoving(null) }
  }

  const left = BODY_MAX - text.length

  return (
    <section className="cm" id="comments">
      <h2 className="cm-head">
        {items.length === 0 ? 'No replies yet' : `${items.length} ${items.length === 1 ? 'reply' : 'replies'}`}
      </h2>

      {items.length > 0 && (
        <ul className="cm-list">
          {items.map(c => {
            const mine = viewer && c.author.handle === viewer.handle
            return (
              <li key={c.id} className="cm-item">
                <Avatar person={c.author} />
                <div className="cm-body">
                  <p className="cm-meta">
                    {c.author.handle
                      ? <Link href={`/u/${c.author.handle}`} className="cm-who">
                          {c.author.name}
                          {c.author.verified && <Verified label={`${c.author.name} is verified`} />}
                        </Link>
                      : <span className="cm-who">{c.author.name}</span>}
                    <span className="cm-dot" aria-hidden="true">·</span>
                    <When iso={c.createdAt} />
                  </p>
                  <p className="cm-text">{c.body}</p>
                </div>
                {(mine || canModerate) && (
                  <button className="cm-x" onClick={() => remove(c.id)} disabled={removing === c.id}
                    aria-label={mine ? 'Delete your reply' : `Delete the reply from ${c.author.name}`}>
                    {removing === c.id ? 'Removing' : 'Delete'}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {viewer ? (
        <form className="cm-form" onSubmit={submit}>
          <Avatar person={viewer} size={34} />
          <div className="cm-field">
            <textarea
              value={text}
              onChange={e => setText(e.target.value.slice(0, BODY_MAX))}
              placeholder="Argue with the number."
              rows={3}
              aria-label="Write a reply"
            />
            <div className="cm-actions">
              <span className={`cm-left${left < 80 ? ' low' : ''}`}>{left < 200 ? left : ''}</span>
              <button type="submit" className="btn-primary" disabled={busy || !text.trim()}>
                {busy ? 'Posting' : 'Reply'}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <p className="cm-signed-out">
          <Link href="/join">Sign in</Link> to reply.
        </p>
      )}

      {error && <p className="notice notice-bad">{error}</p>}
    </section>
  )
}
