'use client'

import { useEffect } from 'react'
import Link from 'next/link'

// What someone sees when a page throws. Next's own fallback is the bare words
// "Application error: a client-side exception has occurred", which tells a
// reader nothing and tells whoever has to fix it even less. This says what
// happened, offers the two things worth trying, and prints the digest, which is
// the only string that can be matched against a server log.
export default function Error ({ error, reset }) {
  useEffect(() => {
    // Reaches the server log, so a failure nobody reports is still recorded.
    console.error('page error', { digest: error?.digest, message: error?.message })
  }, [error])

  return (
    <div className="errpage">
      <div className="errpage-body">
        <p className="errpage-kicker">Something broke</p>
        <h1 className="display">This page did not load.</h1>
        <p>
          It is not something you did. Try again, and if it keeps happening the code below is
          what identifies this particular failure.
        </p>
        <div className="errpage-do">
          <button className="btn-primary" onClick={() => reset()}>Try again</button>
          <Link className="btn-ghost" href="/app">Back to the app</Link>
        </div>
        {error?.digest && <p className="errpage-digest">Reference: {error.digest}</p>}
      </div>
    </div>
  )
}
