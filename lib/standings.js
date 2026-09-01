// One ranking, derived the same way everywhere: every rated album ordered by its
// final score. Ties break on title so the order never shuffles between renders.
export function rank (reviews) {
  return reviews
    .filter(r => typeof r.final === 'number')
    .sort((a, b) => (b.final - a.final) || (a.albumName || '').localeCompare(b.albumName || ''))
    .map((r, i) => ({ ...r, rank: i + 1 }))
}

// Places gained or lost against a frozen snapshot. Positive means it climbed.
export function withDeltas (ranked, snapshot) {
  const before = snapshot?.ranks || null
  return ranked.map(r => {
    if (!before) return { ...r, rankDelta: null, isNew: false }
    const was = before[r.albumId]
    if (was === undefined) return { ...r, rankDelta: null, isNew: true }
    return { ...r, rankDelta: was - r.rank, isNew: false }
  })
}

export const ranksOf = ranked =>
  Object.fromEntries(ranked.map(r => [r.albumId, r.rank]))

// Scores as well as places, so a re-rating that does not move an album can
// still be shown as the score change it is.
export const ratingsOf = ranked =>
  Object.fromEntries(ranked.map(r => [r.albumId, r.final]))
