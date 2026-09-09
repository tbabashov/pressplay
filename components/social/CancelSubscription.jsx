'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { fetchJson } from '@/lib/fetch-json'
import { fullDate } from '@/lib/when'

// Ending a subscription, from the account screen.
//
// Two presses rather than a typed confirmation. Deleting an account asks you to
// type your handle because it cannot be undone; this can — the tier is kept to
// the end of the period already paid for and a cancelled subscription can be
// bought again — so the weight of the ask is set to match.
//
// It says what stays and until when, not just that it worked. "Cancelled" on
// its own reads as "gone now", and somebody who thinks they have lost what they
// paid for goes looking for the refund button.
export default function CancelSubscription ({ tierName, status, endsAt, renewsAt }) {
  const [asked, setAsked] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(null)
  const router = useRouter()

  const already = ['cancelled', 'expired'].includes(String(status || '').toLowerCase())
  const until = done?.endsAt || endsAt || renewsAt

  // Already cancelled before this screen was opened, or just now: the same
  // sentence either way, because it is the same state.
  if (done || already) {
    return (
      <p className="set-intro measure sub-cancelled">
        This subscription will not renew.{' '}
        {until
          ? <>You keep <strong>{tierName}</strong> until <strong>{fullDate(until)}</strong>.</>
          : <>You keep <strong>{tierName}</strong> until the period you have paid for runs out.</>}
      </p>
    )
  }

  const cancel = async () => {
    setBusy(true); setError('')
    try {
      const data = await fetchJson('/api/subscription/cancel', { method: 'POST' })
      setDone(data)
      // The tier and the dates are rendered by the server on this page, so it
      // has to hear about this too or the paragraph above still says renewing.
      router.refresh()
    } catch (e) {
      setError(e.message)
      setAsked(false)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="sub-cancel">
      {!asked
        ? (
          <button className="btn-ghost sub-cancel-open" onClick={() => setAsked(true)}>
            Cancel subscription
          </button>
          )
        : (
          <div className="sub-cancel-ask">
            <p>
              Cancel your <strong>{tierName}</strong> subscription? It will not renew, and
              you keep everything it includes until{' '}
              {(endsAt || renewsAt) ? <strong>{fullDate(endsAt || renewsAt)}</strong> : 'the end of the period you have paid for'}.
            </p>
            <div className="sub-cancel-do">
              <button className="sub-cancel-yes" onClick={cancel} disabled={busy}>
                {busy ? 'Cancelling…' : 'Yes, cancel it'}
              </button>
              <button className="btn-ghost" onClick={() => setAsked(false)} disabled={busy}>
                Keep it
              </button>
            </div>
          </div>
          )}
      {error && <p className="notice notice-bad">{error}</p>}
    </div>
  )
}
