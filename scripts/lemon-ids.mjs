// Prints the ids Lemon Squeezy does not show you in its dashboard.
//
// The store page shows a slug, not the numeric store id, and a variant id is
// only in the address bar of a page you have to click into one at a time. Both
// are in the API, so this asks for them and prints them in the shape the
// environment variables want.
//
//   node scripts/lemon-ids.mjs YOUR_API_KEY
//
// The key is read from the argument or from LEMONSQUEEZY_API_KEY. Nothing is
// written anywhere and nothing is logged but ids, names and prices.

const key = process.argv[2] || process.env.LEMONSQUEEZY_API_KEY

if (!key) {
  console.error('Usage: node scripts/lemon-ids.mjs YOUR_API_KEY')
  process.exit(1)
}

const get = async path => {
  const res = await fetch(`https://api.lemonsqueezy.com/v1/${path}`, {
    headers: {
      Accept: 'application/vnd.api+json',
      Authorization: `Bearer ${key}`
    }
  })
  const text = await res.text()
  if (!res.ok) {
    // The API's own message says whether the key is wrong or merely lacks a
    // scope, which is worth far more than a status code on its own.
    console.error(`\n  ${path} failed: ${res.status}`)
    console.error(`  ${text.slice(0, 300)}\n`)
    process.exit(1)
  }
  return JSON.parse(text)
}

const money = cents =>
  typeof cents === 'number' ? `$${(cents / 100).toFixed(2)}` : '-'

const stores = await get('stores')

console.log('\nSTORES')
for (const s of stores.data) {
  console.log(`  ${s.id}  ${s.attributes.name}  (${s.attributes.slug})`)
}

// include=product so each variant can be printed under the thing it belongs to;
// on its own a variant is called "Monthly" and nothing else, which is the same
// name four times over.
const variants = await get('variants?include=product')
const products = Object.fromEntries(
  (variants.included || [])
    .filter(x => x.type === 'products')
    .map(p => [p.id, p.attributes.name])
)

console.log('\nVARIANTS')
const rows = variants.data.map(v => ({
  id: v.id,
  product: products[v.relationships?.product?.data?.id] || '?',
  name: v.attributes.name,
  price: money(v.attributes.price),
  // A subscription variant has an interval; a one-off does not. Only the
  // subscriptions belong in the environment variables.
  interval: v.attributes.interval || 'one-off'
}))

const pad = (s, n) => String(s).padEnd(n)
for (const r of rows) {
  console.log(`  ${pad(r.id, 10)} ${pad(r.product, 26)} ${pad(r.name, 14)} ${pad(r.price, 10)} ${r.interval}`)
}

console.log('\nPASTE INTO VERCEL')
console.log(`  LEMONSQUEEZY_STORE_ID=${stores.data[0]?.id ?? '?'}`)
for (const r of rows.filter(r => r.interval !== 'one-off')) {
  const tier = /max/i.test(r.product) ? 'MAX' : /plus/i.test(r.product) ? 'PLUS' : null
  const period = r.interval === 'year' ? 'YEARLY' : r.interval === 'month' ? 'MONTHLY' : null
  if (tier && period) console.log(`  LS_VARIANT_${tier}_${period}=${r.id}`)
}
console.log('')
