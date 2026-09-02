'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import TiersScreen from '@/components/TiersScreen'

// The same screen as /tiers, over whatever you were doing. It is rendered into
// the document rather than wherever it was called from: inside the app shell it
// inherited a stacking context and a scroll container, so a full screen overlay
// was only as full screen as the column it was declared in.
export default function Paywall ({ tier, used, limit, reason, onClose }) {
  const [host, setHost] = useState(null)
  useEffect(() => { setHost(document.body) }, [])

  useEffect(() => {
    const esc = e => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', esc)
    // The page behind must not scroll while this is up.
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', esc)
      document.body.style.overflow = prev
    }
  }, [onClose])

  if (!host) return null

  const heading = reason ||
    (limit ? `${used} of ${limit} records used. It resets at midnight.` : undefined)

  return createPortal((
    <div className="pw-over" role="dialog" aria-modal="true" aria-label="Subscriptions">
      <TiersScreen mine={tier} heading={heading} reason={reason} onClose={onClose} />
    </div>
  ), host)
}
