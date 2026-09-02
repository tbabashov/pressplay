'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { readConsent, writeConsent } from '@/lib/consent'

// Shown once, until it is answered. It does not block the page: nothing on
// this site tracks anyone, so there is nothing to withhold while someone
// decides, and a full screen wall over a page that sets no advertising cookies
// would be theatre.
export default function CookieBanner () {
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Read after mount. The server has no idea what this browser chose, and
    // rendering the banner on the server would flash it at people who already
    // answered.
    if (!readConsent()) setShow(true)
  }, [])

  if (!show) return null

  const answer = optional => { writeConsent(optional); setShow(false) }

  return (
    <div className="ck" role="dialog" aria-label="Cookies and storage">
      <div className="ck-body">
        <p className="ck-text">
          <strong>Signing in sets three cookies.</strong> They keep you signed in and stop a
          sign-in form being submitted from somewhere else, and none of them exist until you
          sign in. There is no advertising, no analytics, and nothing that follows you to
          another site. Separately, this browser can remember how you like your slides set up.
          That part is optional.{' '}
          <Link href="/legal/cookies">What is stored, exactly</Link>.
        </p>
        <div className="ck-do">
          <button className="ck-no" onClick={() => answer(false)}>Only what is needed</button>
          <button className="ck-yes" onClick={() => answer(true)}>Remember my settings</button>
        </div>
      </div>
    </div>
  )
}
