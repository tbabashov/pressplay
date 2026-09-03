// The grid needs a card's worth of fields, not whole tracklists. Projecting
// keeps a library of a few hundred albums from shipping megabytes to the client.
export const projectReview = r => ({
  albumId: r.albumId,
  albumName: r.albumName,
  artist: r.artist,
  cover: r.cover,
  year: r.year,
  // Carried so the leaderboard can filter on it. It is already on the album
  // that was saved with the review, it just was not being passed along.
  genre: r.album?.genre ?? null,
  final: r.final ?? null,
  songs: r.album?.tracks?.length ?? 0,
  runtimeMs: r.album?.runtimeMs ?? 0,
  scaleModel: r.scaleModel ?? null,
  createdAt: r.createdAt ?? null,
  updatedAt: r.updatedAt ?? null
})
