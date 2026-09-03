import { Suspense } from 'react'
import Link from 'next/link'
import Mark from '@/components/Mark'
import ResetForm from '@/components/social/ResetForm'

export const metadata = { title: 'Choose a new password' }

// Deliberately not the sign-in page. Somebody who followed a link out of their
// email should land on the one thing they came to do, in the same room the
// sign-in lives in so it does not feel like a different site.
export default function ResetPage () {
  return (
    <div className="jn">
      <div className="jn-left">
        <Link href="/" className="jn-mark">
          <Mark size={19} />
          <strong>Press Play</strong>
        </Link>

        <div className="jn-panel">
          <h1 className="jn-h1 display">Choose a new password</h1>
          <p className="jn-sub">
            The link you followed works once. Pick something you have not used elsewhere.
          </p>
          <Suspense fallback={<p className="jn-sub">Checking the link…</p>}>
            <ResetForm />
          </Suspense>
        </div>

        <p className="jn-legal">
          Did not ask for this? Nothing has changed, and the link expires by itself.
        </p>
      </div>
    </div>
  )
}
