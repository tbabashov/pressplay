'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// Publishing is the moment a rating stops being private, so the control says
// what will happen and the link to the public page appears only once it has.
export default function PublishToggle ({ albumId, initial, href }) {
  const [published, setPublished] = useState(Boolean(initial))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const router = useRouter()

  const toggle = async () => {
    setBusy(true); setError('')
    const next = !published
    try {
      const res = await fetch(`/api/reviews/${encodeURIComponent(albumId)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ published: next })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'That did not work.')
      setPublished(data.published)
      router.refresh()
    } catch (e) {
      setError(e.message)
    } finally { setBusy(false) }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(new URL(href, window.location.origin).toString())
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch { setError('Could not copy the link.') }
  }

  return (
    <div className="pt">
      <div className="pt-row">
        <button className={published ? 'btn-ghost' : 'btn-primary'} onClick={toggle} disabled={busy}>
          {busy ? 'Saving' : published ? 'Make private' : 'Publish'}
        </button>
        {published && (
          <>
            <a className="btn-ghost" href={href}>View public page</a>
            <button className="btn-ghost" onClick={copy}>{copied ? 'Copied' : 'Copy link'}</button>
          </>
        )}
      </div>
      <p className="pt-note">
        {published
          ? 'Anyone with the link can read this rating and reply to it.'
          : 'Only you can see this rating. Publishing gives it a page and opens replies.'}
      </p>
      {error && <p className="notice notice-bad">{error}</p>}
    </div>
  )
}
