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
  //
  // Read from the lite columns first. A lite read computes these three in
  // Postgres and leaves the snapshot there, so this is the only place that has
  // to know both shapes: the ?? chain takes the computed value when it is
  // there and the snapshot when the whole row was loaded.
  genre: r.albumGenre ?? r.album?.genre ?? null,
  final: r.final ?? null,
  songs: r.albumSongs ?? r.album?.tracks?.length ?? 0,
  runtimeMs: r.albumRuntimeMs ?? r.album?.runtimeMs ?? 0,
  scaleModel: r.scaleModel ?? null,
  createdAt: r.createdAt ?? null,
  updatedAt: r.updatedAt ?? null
})
