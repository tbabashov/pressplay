'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { TIER_LIST, priceLabel } from '@/lib/tiers'
import CheckoutButton from '@/components/CheckoutButton'
import CoverStream from '@/components/CoverStream'

export default function Paywall ({ tier, used, limit, reason, onClose }) {
  // Rendered into the document rather than wherever it was called from. Inside
  // the app shell it inherited a stacking context and a scroll container, so a
  // full screen overlay was only as full screen as the column it was declared
  // in. This is a screen of its own.
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

  return createPortal((
    <div className="pw" role="dialog" aria-modal="true" aria-label="Subscriptions">
      {/* The same drifting wall the tiers screen uses, so the two are one
          place rather than two designs that happen to sell the same thing. */}
      <CoverStream />

      <div className="pw-body">
        <button className="pw-x" onClick={onClose} aria-label="Close">
          <svg viewBox="0 0 24 24"><path d="M6.5 6.5l11 11m0-11l-11 11" fill="none"
            stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
        </button>

        <header className="pw-head">
          <p className="pw-kicker">{reason ? 'Not on your tier' : 'That is today'}</p>
          <h2 className="display">
            {reason || `${used} of ${limit} records used. It resets at midnight.`}
          </h2>
          <p className="pw-sub">
            Nothing you have rated is going anywhere, and the social side has no limits at any
            tier. This is only about how many records a day you turn into slides, and what you
            can turn them into.
          </p>
        </header>

        <div className="pw-cards">
          {TIER_LIST.filter(t => t.key !== 'free').map(t => (
            <section key={t.key} className={`pw-card${t.key === tier ? ' on' : ''}`}>
              <header>
                <h3>{t.name}</h3>
                {t.key === tier && <span className="pw-now">Your tier</span>}
              </header>
              <p className="pw-price">
                <strong>{priceLabel(t.monthly)}</strong><em>a month</em>
              </p>
              <p className="pw-year">or {priceLabel(t.yearly)} a year</p>
              <ul>
                {t.perks.slice(0, 5).map(p => (
                  <li key={p}>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"
                      fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"
                      strokeLinejoin="round" /></svg>
                    {p}
                  </li>
                ))}
              </ul>
              <CheckoutButton tier={t.key} name={t.name} className="btn-primary pw-buy" />
            </section>
          ))}
        </div>

        <footer className="pw-foot">
          <a href="/tiers">See everything each tier includes</a>
          <button onClick={onClose}>Not now</button>
        </footer>
      </div>
    </div>
  ), host)
}
