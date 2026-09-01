// Next hands dynamic segments over still percent-encoded, so an id containing a
// colon ("dg:668886") arrives as "dg%3A668886" and misses every lookup keyed on
// the real value. Decoding is safe to run on an already-decoded string, except
// for a stray percent sign, which is why this never throws.
export function param (value) {
  if (typeof value !== 'string') return value
  try { return decodeURIComponent(value) } catch { return value }
}
