import Link from 'next/link'
import { TIER_DETAIL } from '@/lib/tiers'
import { fullDate } from '@/lib/when'
import CancelSubscription from './CancelSubscription'

// What this account is on, in full.
//
// The tier used to be one sentence and a link. That was fine while a
// subscription was something you could only start: there was nothing to say
// about one you already had, and nowhere to end it. Now there is, and the
// things somebody actually wants to know — what am I paying, when does it go
// again, what do I get, how do I stop — belong in one place rather than spread
// between here, the tiers screen and an email from the provider.
//
// Everything printed here is something the account actually knows. The price is
// shown only when the stored variant says which one was bought; a monthly price
// printed over a yearly subscription would be a lie told by a helpful screen.

const STATUS = {
  active: 'Active',
  on_trial: 'On trial',
  past_due: 'Payment failed',
  cancelled: 'Will not renew',
  paused: 'Paused',
  expired: 'Ended',
  unpaid: 'Unpaid'
}

export default function TierPanel ({ tier, profile, period }) {
  const detail = TIER_DETAIL[tier] || TIER_DETAIL.free
  const status = String(profile?.subscriptionStatus || '').toLowerCase()
  const paid = detail.monthly > 0
  const hasSubscription = Boolean(profile?.subscriptionId)
  const ending = ['cancelled', 'paused'].includes(status)
  const when = profile?.subscriptionEndsAt || profile?.subscriptionRenewsAt

  // Only when the variant matched one of the configured ones. An unknown
  // variant means the price on file is not one this build sells.
  const price = period === 'yearly'
    ? { amount: detail.yearly, per: 'a year' }
    : period === 'monthly'
      ? { amount: detail.monthly, per: 'a month' }
      : null

  const daily = detail.limits.generationsPerDay
  const perDay = daily === Infinity ? 'No daily limit' : `${daily} record${daily === 1 ? '' : 's'} a day`

  return (
    <section className={`tp tp-${tier}`}>
      <header className="tp-head">
        <span className={`tp-name tp-name-${tier}`}>{detail.name}</span>
        {price
          ? <span className="tp-price"><strong>${price.amount.toFixed(2)}</strong> {price.per}</span>
          : paid && hasSubscription
            // The variant on file is not one this build sells, so the amount is
            // not ours to state.
            ? <span className="tp-price tp-price-unknown">Billed by Lemon Squeezy</span>
            : null}
      </header>

      <p className="tp-state">
        {!hasSubscription
          ? paid
            // The owner, or an account granted a tier by hand.
            ? <>On {detail.name} without a subscription — nothing is being billed.</>
            : <>No subscription. {perDay} on the slides.</>
          : (
            <>
              <strong>{STATUS[status] || 'Active'}</strong>
              {ending && when
                ? <> — you keep {detail.name} until <strong>{fullDate(when)}</strong>, then this account returns to Free.</>
                : status === 'past_due'
                  ? <> — the last charge did not go through. It is being retried, and nothing has been taken away yet.</>
                  : when
                    ? <> — renews on <strong>{fullDate(when)}</strong>.</>
                    : null}
            </>
            )}
      </p>

      <ul className="tp-perks">
        {detail.perks.map(perk => (
          <li key={perk}>
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M5 12.5 10 17.5 19 7" fill="none" stroke="currentColor"
                strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {perk}
          </li>
        ))}
      </ul>

      <div className="tp-do">
        {hasSubscription
          ? <CancelSubscription
              tierName={detail.name}
              status={profile.subscriptionStatus}
              endsAt={profile.subscriptionEndsAt}
              renewsAt={profile.subscriptionRenewsAt}
            />
          : null}
        <Link className="tp-see" href="/tiers?from=/app/settings">
          {paid ? 'Compare the tiers' : 'See what the paid tiers add'}
        </Link>
      </div>
    </section>
  )
}
