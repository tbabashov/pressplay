// Best song and worst song fill themselves in when nothing has been chosen.
//
// The rating screen already promised this: leaving best song alone shows the
// top scored track's name in the empty option, so it reads as decided. Nothing
// resolved it though, so the promise held on the screen and broke everywhere
// else. The stored value was still an empty string, and every block that shows
// a superlative checks for a value before drawing itself, so the best song
// simply did not appear on the slides.
//
// Resolved on the way out rather than written into the review, so it stays
// true. Score one more track higher than the rest and the automatic pick moves
// with it, which a value frozen at save time would not.

// A track is called `name` in the album as it was saved and `title` once the
// rating screen has shaped it, and both shapes reach here: the export builds
// from the raw snapshot, the rating screen from album-shape. Reading only one
// of them is why this returned nothing on the slides while working on screen.
//
// N/A is stored as a string, so a plain typeof check already excludes skits
// from both ends. A skit is not the worst song on the record; it is not a song.
const scored = (scores, tracks) => (tracks || [])
  .map(t => ({ title: t.title ?? t.name, value: scores?.[t.id] }))
  .filter(x => typeof x.value === 'number' && x.title)

export function autoBestSong (scores, tracks) {
  const list = scored(scores, tracks)
  if (!list.length) return null
  return list.reduce((a, b) => (b.value > a.value ? b : a)).title
}

export function autoWorstSong (scores, tracks) {
  const list = scored(scores, tracks)
  // One scored track is its own best and its own worst, and a record where
  // everything got the same number has no worst either. Naming one anyway
  // would be inventing an opinion nobody expressed.
  if (list.length < 2) return null
  const low = list.reduce((a, b) => (b.value < a.value ? b : a))
  const high = list.reduce((a, b) => (b.value > a.value ? b : a))
  return low.value < high.value ? low.title : null
}

// The selections as they should be shown: what was chosen, plus the two that
// fill themselves in. An explicit pick always wins over the automatic one.
export function resolveSelections (selections, scores, tracks) {
  const out = { ...(selections || {}) }
  if (!out.bestSong) {
    const best = autoBestSong(scores, tracks)
    if (best) out.bestSong = best
  }
  if (!out.worstSong) {
    const worst = autoWorstSong(scores, tracks)
    // Never the same track twice. On a two track record the lower one is a
    // real worst, but if it also came out top there is nothing to say.
    if (worst && worst !== out.bestSong) out.worstSong = worst
  }
  return out
}
