// What someone chose about optional storage.
//
// The three cookies this site sets are all strictly necessary: they exist to
// sign you in and to stop a sign-in form being submitted from somewhere else.
// Nothing consents to those, because refusing them means refusing to sign in,
// and none of them are set at all until you do.
//
// What is genuinely optional is the browser remembering your slide settings
// between visits. That is what the banner asks about, and declining it has a
// real effect rather than being a button that does nothing.
//
// The choice itself has to be remembered somewhere, and that somewhere is this
// one key. Storing a refusal in order to honour it is the one piece of storage
// a refusal cannot switch off.

export const CONSENT_KEY = 'ppr.consent'
export const CONSENT_VERSION = 1

export function readConsent () {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY)
    if (!raw) return null
    const v = JSON.parse(raw)
    return v && v.version === CONSENT_VERSION ? v : null
  } catch { return null }
}

export function writeConsent (optional) {
  try {
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify({
      version: CONSENT_VERSION, optional: !!optional, at: new Date().toISOString()
    }))
    // Anything already stored under a permission that has just been withdrawn
    // has to go, or declining would only stop new writes.
    if (!optional) {
      for (const k of Object.keys(window.localStorage)) {
        if (k.startsWith('ppr.') && k !== CONSENT_KEY) window.localStorage.removeItem(k)
      }
    }
    window.dispatchEvent(new CustomEvent('ppr:consent', { detail: { optional: !!optional } }))
  } catch { /* a browser with storage blocked has already declined */ }
}

// Every optional write goes through this, so a refusal is enforced in one
// place rather than remembered at each call site.
export function mayStore () {
  return readConsent()?.optional === true
}
