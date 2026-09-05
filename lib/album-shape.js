// An imported review carries its own album snapshot, in the shape the export
// frames use. The rating screen speaks the catalogue's shape. This converts.
export function fromSnapshot (snap) {
  if (!snap) return null
  return {
    id: String(snap.id),
    name: snap.name,
    // Every credit, as one line. artists is the list and artist is how the list
    // reads: the columns, the cards and the dock all want a string, and taking
    // only the first name printed one half of a duo everywhere.
    artist: (snap.artists || []).filter(Boolean).join(', ') || 'Unknown',
    // Every main credit, not only the first. Dropping the rest here was why a
    // record by two people came back credited to one of them after a reload,
    // and why the next save then wrote that single name back over the pair.
    artists: (snap.artists || []).filter(Boolean),
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
    // The list, when there is one. It used to put album.artist at the front of
    // it, because that was the field being edited and the list behind it could
    // be stale. The credit is edited as a list now, and artist is written from
    // it, so prepending that string filed the whole joined line as if it were
    // one more artist's name.
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

// The album as the rater saved it, with the few things put back that only the
// catalogue knows.
//
// The saved snapshot is the truth about everything a rater can change: a track
// title they fixed, a feature they added, the album name, the year, the cover.
// The rating screen used to read the catalogue first and fall back to the
// snapshot only when the catalogue had never heard of the record, so every
// correction was saved and then thrown away on the next page load.
//
// The catalogue is still needed, because a snapshot cannot carry which tracks
// have a playable preview, and it is the only place the artist id comes from.
// None of that is editable, so none of it can overwrite a correction.
export function preferSaved (saved, catalogue) {
  if (!saved) return catalogue
  if (!catalogue) return saved

  const byId = new Map((catalogue.tracks || []).map(t => [String(t.id), t]))
  return {
    ...saved,
    // Not editable, and known only to the catalogue.
    artistId: catalogue.artistId ?? null,
    label: catalogue.label ?? null,
    // It is in the catalogue after all, so its previews can play.
    imported: false,
    // Fallbacks, never overrides. An empty field in the snapshot is a gap
    // worth filling; a filled one is a decision worth keeping.
    cover: saved.cover || catalogue.cover || null,
    genre: saved.genre || catalogue.genre || null,
    year: saved.year || catalogue.year || null,
    tracks: (saved.tracks || []).map(t => {
      const c = byId.get(String(t.id))
      // Only the preview flag, and only for a track the catalogue still has.
      // A track the rater added or renamed keeps everything else it has.
      return c ? { ...t, preview: c.preview } : t
    })
  }
}
