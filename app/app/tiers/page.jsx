import { auth } from '@/auth'
import { getProfile } from '@/lib/db'
import { accountTier, TIER_LIST } from '@/lib/tiers'

export const metadata = { title: 'Tiers' }
export const dynamic = 'force-dynamic'

const price = n => (n === 0 ? 'Free' : `£${n}`)

export default async function Tiers () {
  const session = await auth()
  if (!session?.user) return null

  const mine = accountTier(session, await getProfile(session.user.email))

  return (
    <>
      <div className="page-head">
        <h1>Tiers</h1>
        <p className="page-sub">
          The free tier is a real one: rate, publish, and post the slides without paying anything.
          What the paid tiers buy is volume and the parts that make the slides yours.
        </p>
      </div>

      <div className="tr-grid">
        {TIER_LIST.map(t => {
          const current = t.key === mine
          return (
            <section key={t.key} className={`tr-card${current ? ' on' : ''}`}>
              <header>
                <h2>{t.name}</h2>
                {current && <span className="tr-now">Your tier</span>}
              </header>
              <p className="tr-blurb">{t.blurb}</p>
              <p className="tr-price">
                <strong>{price(t.monthly)}</strong>
                {t.monthly > 0 && <em>a month</em>}
              </p>
              {t.yearly > 0 && (
                <p className="tr-year">or £{t.yearly} a year, which is two months back</p>
              )}
              <ul className="tr-perks">
                {t.perks.map(p => (
                  <li key={p}>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"
                      fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"
                      strokeLinejoin="round" /></svg>
                    {p}
                  </li>
                ))}
              </ul>
              {current
                ? <p className="tr-state">This is what you are on.</p>
                : t.monthly === 0
                  ? <p className="tr-state">Where every account starts.</p>
                  : <p className="tr-soon">Checkout is not connected yet.</p>}
            </section>
          )
        })}
      </div>

      <p className="tr-note measure">
        Payment is not wired up. The tiers decide what an account may do, and the limits are
        enforced on the server, but there is nothing to take your money with yet, so nobody is
        being charged and no card details are collected anywhere in this app.
      </p>
    </>
  )
}
