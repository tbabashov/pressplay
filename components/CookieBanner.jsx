'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { readConsent, writeConsent } from '@/lib/consent'

// The familiar three-button notice. One line of the usual wording is
// deliberately not here: this site runs no analytics and personalises nothing,
// so claiming it does in a consent notice would be a false statement in the
// one document that has to be true. The moment either exists, the sentence
// goes in and this becomes a real category to reject.
export default function CookieBanner () {
  const [show, setShow] = useState(false)
  const [manage, setManage] = useState(false)
  const [optional, setOptional] = useState(true)

  useEffect(() => {
    // Read after mount. The server does not know what this browser chose, and
    // rendering on the server would flash the notice at people who answered
    // months ago.
    if (!readConsent()) setShow(true)
  }, [])

  useEffect(() => {
    const open = () => { setManage(true); setShow(true) }
    window.addEventListener('ppr:cookie-settings', open)
    return () => window.removeEventListener('ppr:cookie-settings', open)
  }, [])

  if (!show) return null

  const answer = allow => { writeConsent(allow); setShow(false); setManage(false) }

  return (
    <div className="ck" role="dialog" aria-label="Cookie notice" aria-modal="false">
      <div className="ck-body">
        {!manage ? (
          <>
            <div className="ck-say">
              <p className="ck-head">We use cookies</p>
              <p className="ck-text">
                We use cookies and similar technologies to keep you signed in, to keep the site
                secure, and to remember your preferences. You can accept all cookies, reject the
                non-essential ones, or manage your preferences. You can change your choices at any
                time in <Link href="/legal/cookies">Cookie Settings</Link>.
              </p>
            </div>
            <div className="ck-do">
              <button className="ck-no" onClick={() => answer(false)}>Reject All</button>
              <button className="ck-mid" onClick={() => setManage(true)}>Manage Preferences</button>
              <button className="ck-yes" onClick={() => answer(true)}>Accept All</button>
            </div>
          </>
        ) : (
          <div className="ck-manage">
            <p className="ck-head">Manage preferences</p>

            <div className="ck-cat">
              <div>
                <strong>Strictly necessary</strong>
                <p>
                  Three cookies that sign you in, keep you signed in, and stop a sign-in form
                  being submitted from another site. None of them exist until you sign in, and
                  the site cannot work without them.
                </p>
              </div>
              <span className="ck-locked">Always on</span>
            </div>

            <div className="ck-cat">
              <div>
                <strong>Preferences</strong>
                <p>
                  Lets this browser remember how you like your slides set up, so the export
                  screen opens the way you left it. Stored on your device and never sent
                  anywhere.
                </p>
              </div>
              <label className="ck-switch">
                <input
                  type="checkbox" checked={optional}
                  onChange={e => setOptional(e.target.checked)}
                />
                <span aria-hidden="true" />
                <em>{optional ? 'On' : 'Off'}</em>
              </label>
            </div>

            <p className="ck-none">
              There is no analytics category and no advertising category, because this site has
              neither. <Link href="/legal/cookies">Everything that is stored</Link>.
            </p>

            <div className="ck-do">
              <button className="ck-no" onClick={() => answer(false)}>Reject All</button>
              <button className="ck-yes" onClick={() => answer(optional)}>Save preferences</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
