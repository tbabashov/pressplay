// Lemon Squeezy: the one place that knows a payment provider exists.
//
// Lemon Squeezy is a merchant of record, which is the reason to pick it here:
// it sells the subscription itself and handles the sales tax and VAT for every
// country it sells into, so there is no tax registration to keep up with.
//
// Nothing in this file throws when it is not configured. An unconfigured build
// has to keep working and keep telling the truth about it, which is what the
// checkout route does with `ready: false`.

import { createHmac, timingSafeEqual } from 'node:crypto'
import { TIERS } from './tiers.js'

export const LEMON_API = 'https://api.lemonsqueezy.com/v1'

const env = (...names) => {
  for (const k of names) {
    const v = process.env[k]
    if (v && String(v).trim()) return String(v).trim()
  }
  return null
}

// Both prefixes are accepted for the variants. Three of these were named
// LEMONSQUEEZY_ and four LS_, which is an invitation to type the wrong one and
// get a screen that says payments are not set up while giving no hint which of
// seven names is missing. Either spelling works; the guide teaches one.
const variant = (tier, period) => env(
  `LS_VARIANT_${tier}_${period}`,
  `LEMONSQUEEZY_VARIANT_${tier}_${period}`
)

export const billing = () => ({
  apiKey: env('LEMONSQUEEZY_API_KEY', 'LS_API_KEY'),
  storeId: env('LEMONSQUEEZY_STORE_ID', 'LS_STORE_ID'),
  webhookSecret: env('LEMONSQUEEZY_WEBHOOK_SECRET', 'LS_WEBHOOK_SECRET'),
  variants: {
    plus: { monthly: variant('PLUS', 'MONTHLY'), yearly: variant('PLUS', 'YEARLY') },
    max: { monthly: variant('MAX', 'MONTHLY'), yearly: variant('MAX', 'YEARLY') }
  }
})

// What is configured, for the health check. Presence only: a billing report
// that printed a value would be a secret in a public URL.
export function billingReport () {
  const b = billing()
  const seen = k => (k ? 'set' : 'MISSING')
  return {
    apiKey: seen(b.apiKey),
    storeId: seen(b.storeId),
    webhookSecret: seen(b.webhookSecret),
    plusMonthly: seen(b.variants.plus.monthly),
    plusYearly: seen(b.variants.plus.yearly),
    maxMonthly: seen(b.variants.max.monthly),
    maxYearly: seen(b.variants.max.yearly)
  }
}

// Selling needs a key, a store and the variant being sold. Taking webhooks needs
// only the secret, and the two are checked apart so a half configured build
// fails on the half that is actually missing.
export const canSell = (tier, period) => {
  const b = billing()
  return Boolean(b.apiKey && b.storeId && b.variants[tier]?.[period])
}

export const canReceiveWebhooks = () => Boolean(billing().webhookSecret)

// Which tier a variant id belongs to, for the webhook: what someone bought is
// the only thing in the payload that says what they should get.
export function tierForVariant (variantId) {
  const id = String(variantId ?? '')
  if (!id) return null
  const v = billing().variants
  for (const tier of TIERS) {
    for (const period of ['monthly', 'yearly']) {
      if (v[tier]?.[period] && v[tier][period] === id) return { tier, period }
    }
  }
  return null
}

// Statuses that still carry the tier.
//
// `cancelled` means it will not renew, not that it has stopped: Lemon Squeezy
// keeps a subscription cancelled until the period already paid for runs out and
// only then sends `expired`. Dropping the tier on cancelled would take away
// time that has been paid for.
//
// `past_due` is a failed renewal that is still being retried. Cutting access
// off on the first failed charge punishes an expired card, and the retries are
// finite: it becomes `unpaid` when they run out, which is not on this list.
const ENTITLED = new Set(['active', 'on_trial', 'past_due', 'cancelled'])

export const entitled = status => ENTITLED.has(String(status ?? '').toLowerCase())

// Lemon Squeezy signs the body with HMAC SHA256 and sends it hex encoded in
// X-Signature. This has to run against the raw body, before any parsing:
// re-serialising the JSON changes the bytes and the digest with it.
export function validSignature (rawBody, header, secret) {
  if (!secret || !header) return false
  const expected = createHmac('sha256', secret).update(rawBody, 'utf8').digest()
  let got
  try { got = Buffer.from(String(header).trim(), 'hex') } catch { return false }
  // timingSafeEqual throws on a length mismatch rather than returning false.
  if (got.length !== expected.length) return false
  return timingSafeEqual(got, expected)
}

// What the webhook should write for a subscription, given its payload. Pure, so
// the mapping from a provider's vocabulary to ours can be tested without a
// provider.
export function subscriptionUpdate (payload) {
  const attrs = payload?.data?.attributes ?? {}
  const status = String(attrs.status ?? '').toLowerCase()
  const known = tierForVariant(attrs.variant_id)

  // A variant nobody configured is not this app's subscription. Guessing a tier
  // from an unknown product is how someone ends up on Max for buying a sticker.
  if (!known) return null

  return {
    tier: entitled(status) ? known.tier : 'free',
    subscriptionId: String(payload?.data?.id ?? '') || null,
    subscriptionStatus: status || null,
    subscriptionVariant: String(attrs.variant_id ?? '') || null,
    renewsAt: attrs.renews_at || null,
    endsAt: attrs.ends_at || null
  }
}

// The account this is about. The email on the Lemon Squeezy order is whatever
// was typed at the till and need not be the one signed in here, so the account
// email is passed through checkout as custom data and that is what is trusted.
export function emailFor (payload) {
  const custom = payload?.meta?.custom_data ?? {}
  const passed = custom.email ?? custom.user_email
  const billed = payload?.data?.attributes?.user_email
  const pick = passed || billed
  return pick ? String(pick).trim().toLowerCase() : null
}
