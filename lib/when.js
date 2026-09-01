// Dates are formatted in UTC on purpose. A server and a browser in different
// zones would otherwise render the same timestamp differently and React would
// throw a hydration mismatch on a date nobody is reading that closely.
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

export function monthYear (iso) {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(+d)) return null
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

export function fullDate (iso) {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(+d)) return null
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

// Only ever called from the client, where "now" is the reader's own clock.
export function ago (iso) {
  if (!iso) return ''
  const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60) return 'just now'
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  if (days < 365) return `${Math.floor(days / 7)}w ago`
  return `${Math.floor(days / 365)}y ago`
}
