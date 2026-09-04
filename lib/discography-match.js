// Matching a rated album to a place in an artist's discography.
//
// Two things go wrong here and both did. A record made by two people is filed
// by the catalogue under one of them, so anything that reads a single artist
// column decides the record belongs to that person and nobody else. And two
// listings of one album often differ only by a mark nobody types the same way
// twice, so a loose title comparison is the difference between one row and two.

// One credit value often names several artists. iTunes files KIDS SEE GHOSTS
// under the single string "KIDS SEE GHOSTS, Kanye West & Kid Cudi", so a whole
// string comparison matched none of the three — not even the duo itself — and
// the record was missing from every discography it belongs to.
//
// The whole string is kept alongside its parts rather than replaced by them,
// because a separator inside a name is not a separator: Earth, Wind & Fire
// splits into three things that are not artists, and splitting alone would
// stop it matching itself.
const SEPARATORS = /\s*(?:,|&|\/|\+|\bfeat\.?\s|\bft\.?\s|\bfeaturing\s)\s*/i

const namesIn = credit => {
  const whole = String(credit ?? '').trim()
  if (!whole) return []
  const parts = whole.split(SEPARATORS).map(s => s.trim()).filter(Boolean)
  return parts.length > 1 ? [whole, ...parts] : [whole]
}

// Every main credit on a review, whatever shape it arrives in. The stored
// snapshot has the full list; the library columns have one name; and either
// may hold several names in one string.
export const creditsOf = review =>
  ((review?.album?.artists?.length ? review.album.artists : [review?.artist, ...(review?.artists || [])])
    .filter(Boolean))
    .flatMap(n => namesIn(n))

// Does this album credit that artist, anywhere in its credits?
export const creditsInclude = (review, artist) => {
  const want = String(artist || '').toLowerCase().trim()
  if (!want) return false
  return creditsOf(review).some(n => n.toLowerCase().trim() === want)
}

// A title reduced to what two listings of the same record have in common.
// "Album (Deluxe Edition)" collapses onto "Album", and a stray mark stops
// splitting one record into two: uknowhatimsayin and uknowhatimsayin¿ are one
// album typed two ways and were being listed twice.
export function albumTitleKey (title) {
  const s = String(title || '')
    .toLowerCase()
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')   // e and é are one title
    .replace(/\s*[([].*$/, '')                            // drop "(Deluxe Edition)"
    .replace(/[^a-z0-9]+/g, '')                           // and every other mark
  // A title made entirely of punctuation would normalise to nothing and then
  // collide with every other one, so it keeps itself instead.
  return s || String(title || '').toLowerCase().trim()
}
