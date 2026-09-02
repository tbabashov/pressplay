import Link from 'next/link'
import { TIER_LIST } from '@/lib/tiers'
import CheckoutButton from '@/components/CheckoutButton'
import CoverStream from '@/components/CoverStream'
import Mark from '@/components/Mark'

// The subscription screen, once. /tiers renders it as a page and the overlay
// renders the same thing over whatever you were doing, so there is no second
// design to keep in step: being sent here by a locked style and walking here
// from the menu arrive at the same place.
export default function TiersScreen ({ mine, heading, reason, onClose, closeHref = '/app' }) {
  return (
    <div className="tw">
      <CoverStream />

      <div className="tw-body">
        <header className="tw-top">
          <span className="tw-mark">
            <Mark size={19} />
            <strong>Press Play</strong>
          </span>
          {onClose
            ? (
              <button className="tw-x" onClick={onClose} aria-label="Close">
                <svg viewBox="0 0 24 24"><path d="M6.5 6.5l11 11m0-11l-11 11" fill="none"
                  stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
              </button>
            )
            : (
              <Link className="tw-x" href={closeHref} aria-label="Close">
                <svg viewBox="0 0 24 24"><path d="M6.5 6.5l11 11m0-11l-11 11" fill="none"
                  stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
              </Link>
            )}
        </header>

        <div className="tw-head">
          {reason && <p className="tw-kicker">Not on your tier</p>}
          <h1 className="display">{heading || 'Two records a day, for nothing.'}</h1>
          <p>
            Rating is unlimited at every tier, and so is everything social. What a subscription
            buys is how many records a day you turn into slides, and what you can turn them into.
          </p>
        </div>

        <div className="tw-grid">
          {TIER_LIST.map(t => {
            const current = t.key === mine
            const cap = t.limits.generationsPerDay
            return (
              <section key={t.key} className={`tw-card${current ? ' on' : ''}`}>
                <header>
                  <h2>{t.name}</h2>
                  {current && <span className="tw-now">Your tier</span>}
                </header>

                {/* Every card in the same order: what you get a day, what it
                    costs, who it is for. */}
                <p className="tw-cap">
                  <strong className="tnum">{cap === Infinity ? '∞' : cap}</strong>
                  <span>{cap === Infinity ? 'no daily limit' : 'records a day'}</span>
                </p>

                <p className="tw-price">
                  {t.monthly === 0
                    ? <strong>Free</strong>
                    : <><strong>${t.monthly.toFixed(2)}</strong><em>a month</em></>}
                </p>
                <p className="tw-year">
                  {t.yearly > 0 ? `or $${t.yearly.toFixed(2)} a year` : 'No card, ever'}
                </p>

                <p className="tw-for">{t.blurb}</p>

                <ul className="tw-perks">
                  {t.perks.map(perk => (
                    <li key={perk}>
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"
                        fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"
                        strokeLinejoin="round" /></svg>
                      {perk}
                    </li>
                  ))}
                </ul>

                <div className="tw-do">
                  {current
                    ? <p className="tw-state">This is what you are on.</p>
                    : t.monthly === 0
                      ? <p className="tw-state">Where every account starts.</p>
                      : <CheckoutButton tier={t.key} name={t.name} className="btn-primary tw-buy" />}
                </div>
              </section>
            )
          })}
        </div>

        <p className="tw-note">
          Payments are not switched on. The tiers decide what an account may do and the limits are
          enforced on the server, but there is nothing to take your money with yet, so nobody is
          being charged and no card details are collected anywhere in this app.
        </p>
      </div>
    </div>
  )
}
