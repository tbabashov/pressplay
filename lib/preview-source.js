// Which catalogue a wall record's preview comes from, as one string.
//
// Deezer is the main one and its ids are bare numbers, which is what every
// entry carried when there was only one source. It does not have everything:
// Linkin Park is on it as an artist with zero albums, and searching its tracks
// for Numb returns covers and tributes and nothing of theirs. Those records
// carry an Apple track id instead, marked with an am prefix.
//
// Everything downstream compares this string rather than a raw id, so nothing
// but the preview route needs to know there are two catalogues. Two records
// that both lack an id must never compare equal, or every unplayable sleeve
// would look like the one currently playing.

export const previewId = a =>
  a?.dz ? String(a.dz) : (a?.am ? `am${a.am}` : null)

export const samePreview = (a, b) => {
  const x = previewId(a)
  return Boolean(x) && x === previewId(b)
}
