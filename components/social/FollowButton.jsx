'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function FollowButton ({ handle, initial, signedIn }) {
  const [following, setFollowing] = useState(Boolean(initial))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  if (!signedIn) {
    return <a className="btn-ghost" href="/join">Sign in to follow</a>
  }

  const toggle = async () => {
    setBusy(true); setError('')
    const next = !following
    setFollowing(next)                       // the button answers immediately
    try {
      const res = await fetch('/api/follow', {
        method: next ? 'POST' : 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ handle })
      })
      if (!res.ok) throw new Error((await res.json()).error || 'That did not work.')
      // The follower count on this page is server rendered, so it needs the
      // page to catch up with what the button just did.
      router.refresh()
    } catch (e) {
      setFollowing(!next)
      setError(e.message)
    } finally { setBusy(false) }
  }

  return (
    <>
      <button
        className={following ? 'btn-ghost is-following' : 'btn-primary'}
        onClick={toggle}
        disabled={busy}
        aria-pressed={following}
      >
        {following ? 'Following' : 'Follow'}
      </button>
      {error && <span className="notice notice-bad">{error}</span>}
    </>
  )
}
