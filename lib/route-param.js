// Next hands dynamic segments over still percent-encoded, so an id containing a
// colon ("dg:668886") arrives as "dg%3A668886" and misses every lookup keyed on
// the real value. Decoding is safe to run on an already-decoded string, except
// for a stray percent sign, which is why this never throws.
export function param (value) {
  if (typeof value !== 'string') return value
  try { return decodeURIComponent(value) } catch { return value }
}

// A path on this site, or the fallback. Used by any screen that takes a "come
// back here" address in the query string.
//
// The check is that it starts with one slash and not two. A single slash is a
// path on this site; two is a protocol-relative URL, so "//evil.example" is a
// different site written to look like a path, and honouring it turns a close
// button into an open redirect. Anything with a scheme — https:, javascript: —
// fails the same test by not starting with a slash at all.
export function samePath (value, fallback) {
  const p = typeof value === 'string' ? value : ''
  return p.startsWith('/') && !p.startsWith('//') ? p : fallback
}
