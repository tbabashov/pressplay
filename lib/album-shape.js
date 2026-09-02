// An imported review carries its own album snapshot, in the shape the export
// frames use. The rating screen speaks the catalogue's shape. This converts.
export function fromSnapshot (snap) {
  if (!snap) return null
  return {
    id: String(snap.id),
    name: snap.name,
    artist: (snap.artists || [])[0] || 'Unknown',
    artistId: null,
    cover: snap.cover || null,
    year: snap.year || null,
    genre: snap.genre || null,
    runtime: Math.round((snap.runtimeMs || 0) / 1000),
    imported: true,
    tracks: (snap.tracks || []).map((t, i) => ({
      id: String(t.id),
      n: t.trackNumber ?? i + 1,
      title: t.name,
      duration: Math.round((t.durationMs || 0) / 1000),
      preview: false,        // imported tracks have no catalogue preview
      features: t.features || []
    }))
  }
}

// The reverse, for exporting an album that came from the catalogue.
export function toSnapshot (album) {
  return {
    id: String(album.id),
    name: album.name,
    // The album carries every main credit; fall back to the single name only
    // when it does not.
    artists: (album.artists?.length ? album.artists : [album.artist]).filter(Boolean),
    cover: album.cover || null,
    year: album.year || null,
    genre: album.genre || null,
    runtimeMs: (album.runtime || 0) * 1000,
    tracks: (album.tracks || []).map(t => ({
      id: String(t.id),
      name: t.title,
      features: t.features || [],
      trackNumber: t.n,
      durationMs: (t.duration || 0) * 1000
    }))
  }
}
