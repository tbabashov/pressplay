import Link from 'next/link'
import { auth } from '@/auth'
import { getProfile } from '@/lib/db'
import { accountTier, TIER_LIST } from '@/lib/tiers'
import CheckoutButton from '@/components/CheckoutButton'
import CoverStream from '@/components/CoverStream'
import Mark from '@/components/Mark'
import '../tiers.css'

export const metadata = { title: 'Tiers' }
export const dynamic = 'force-dynamic'

// Deliberately not under /app. This is not a page of the app with a sidebar
// down the left: it is the screen you are sent to when something is not on
// your tier, and it should read as its own place, with one way out.
export default async function TiersPage () {
  const session = await auth()
  const mine = session?.user ? accountTier(session, await getProfile(session.user.email)) : null

  return (
    <main className="tw">
      <CoverStream />

      <div className="tw-body">
        <header className="tw-top">
          <Link href={session?.user ? '/app' : '/'} className="tw-mark">
            <Mark size={19} />
            <strong>Press Play</strong>
          </Link>
          <Link href={session?.user ? '/app' : '/'} className="tw-x" aria-label="Close">
            <svg viewBox="0 0 24 24"><path d="M6.5 6.5l11 11m0-11l-11 11" fill="none"
              stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
          </Link>
        </header>

        <div className="tw-head">
          <h1 className="display">Two records a day, for nothing.</h1>
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
                    costs, who it is for. Leading two of them on the cap and one
                    on the price is what made the row read as three different
                    designs. */}
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
    </main>
  )
}
