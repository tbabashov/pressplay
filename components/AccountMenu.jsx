'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import Verified from './Verified'
import { signOut } from 'next-auth/react'

// One account control for both shells. Closed it is a picture and the word
// Profile; open it is the two things anyone actually wants from it.
export default function AccountMenu ({ name, image, handle, role, verified = false }) {
  // This menu is in the app bar and in the marketing nav, so where closing
  // the tiers screen should return to depends on which one you opened it from.
  const path = usePathname()
  const [open, setOpen] = useState(false)
  const [quota, setQuota] = useState(null)
  const box = useRef(null)

  // Fetched when the menu opens rather than on every page, so a number nobody
  // is looking at costs nothing.
  useEffect(() => {
    if (!open || quota) return
    let alive = true
    fetch('/api/generations')
      .then(r => (r.ok ? r.json() : null))
      .then(d => { if (alive && d) setQuota(d) })
      .catch(() => {})
    return () => { alive = false }
  }, [open, quota])

  useEffect(() => {
    if (!open) return
    const away = e => { if (!box.current?.contains(e.target)) setOpen(false) }
    const esc = e => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', away)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('pointerdown', away)
      document.removeEventListener('keydown', esc)
    }
  }, [open])

  const initial = (name || '?').trim()[0]?.toUpperCase() || '?'

  return (
    <div className="acct" ref={box}>
      <button
        className="acct-btn"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        {image
          ? <img className="acct-pfp" src={image} alt="" width="28" height="28" referrerPolicy="no-referrer" />
          : <span className="acct-pfp acct-pfp-blank" aria-hidden="true">{initial}</span>}
        <span className="acct-label">Profile</span>
        <svg className={`acct-chev${open ? ' up' : ''}`} viewBox="0 0 24 24" aria-hidden="true">
          <path d="m6 9.5 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div className="acct-menu" role="menu">
          <div className="acct-who">
            <strong>{name || handle || 'You'}{verified && <Verified />}</strong>
            {handle && <span>/u/{handle}</span>}
            {role === 'owner' && <em className="acct-owner">Owner</em>}
          </div>

          {/* What you are on, and what is left of today. Both here because this
              is where anyone looks when they wonder why something stopped. */}
          {/* Two separate statements: which tier the account is on, and what
              is left of today. Boxed together they read as one label with a
              number stuck to it. */}
          {/* Says which tier this is and stops there. It used to be a second
              link to the tiers screen, which in a menu this size meant two rows
              going to one place; the gold row below is the way there now. */}
          <div className="acct-plan">
            <span className="acct-plan-left">
              <span className={`acct-tier acct-tier-${quota?.tier || 'free'}`}>
                {quota ? quota.tierName : 'Your tier'}
              </span>
              <span className="acct-plan-sub">
                {quota?.unlimited ? 'Everything unlocked' : 'What this account is on'}
              </span>
            </span>
          </div>

          <div className="acct-quota">
            <span>
              {!quota
                ? 'Checking today…'
                : quota.unlimited
                  ? 'No daily limit'
                  : `${quota.left} of ${quota.limit} record${quota.limit === 1 ? '' : 's'} left today`}
            </span>
            {quota && !quota.unlimited && (
              <span className="acct-bar" aria-hidden="true">
                <i style={{ width: `${Math.round((quota.used / quota.limit) * 100)}%` }} />
              </span>
            )}
          </div>

          {handle && (
            <Link role="menuitem" href={`/u/${handle}`} onClick={() => setOpen(false)}>
              Your public page
            </Link>
          )}

          {/* The one paid thing in the menu, and the one row that is not grey.
              It carries where it was pressed, so closing the tiers screen comes
              back to the screen this menu was open over. */}
          <Link role="menuitem" className="acct-upgrade"
            href={`/tiers?from=${encodeURIComponent(path || '/app')}`}
            onClick={() => setOpen(false)}>
            Upgrade
          </Link>

          <Link role="menuitem" href="/app/settings" onClick={() => setOpen(false)}>
            Account
          </Link>
          <button role="menuitem" className="acct-out" onClick={() => signOut({ callbackUrl: '/' })}>
            Log out
          </button>
        </div>
      )}
    </div>
  )
}
