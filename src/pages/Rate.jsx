import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, proxyImg } from '../api.js'
import { ratingColor, scoreText, SCALE_ROWS, SKIT, fmtDuration, fmtRuntime } from '../colors.js'
import { CRITERIA, NA, parseScore, fmtScore } from '../rating.js'

// Best/Worst are the only two that still make it into an image; the rest are
// kept so old reviews don't lose the picks they already have.
const SELECTORS = [
  ['bestSong', 'Best Song'],
  ['worstSong', 'Worst Song']
]

// A transparent artist cut-out for the title card's glass dome. Kept tall and
// lossless — these are PNGs with alpha, so JPEG re-encoding isn't an option.
function readArtistPng (file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, 1100 / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read that image')) }
    img.src = url
  })
}

export default function Rate () {
  const { albumId } = useParams()
  const nav = useNavigate()
  const [album, setAlbum] = useState(null)
  const [ratings, setRatings] = useState({})
  const [selections, setSelections] = useState({})
  const [thoughts, setThoughts] = useState('')
  const [titleOverrides, setTitleOverrides] = useState({})
  const [editingTitle, setEditingTitle] = useState(null)
  const [featureOverrides, setFeatureOverrides] = useState({})
  const [editingFeat, setEditingFeat] = useState(null)
  const [runtimeOverrideMs, setRuntimeOverrideMs] = useState(null)
  const [editingRuntime, setEditingRuntime] = useState(false)
  const [genreOverride, setGenreOverride] = useState(null)
  const [editingGenre, setEditingGenre] = useState(false)
  const [artistsOverride, setArtistsOverride] = useState(null)
  const [editingArtists, setEditingArtists] = useState(false)
  const [nameOverride, setNameOverride] = useState(null)
  const [editingName, setEditingName] = useState(false)
  const [yearOverride, setYearOverride] = useState(null)
  const [editingYear, setEditingYear] = useState(false)
  const [orderOverride, setOrderOverride] = useState(null)
  const [dragId, setDragId] = useState(null)
  const [dragOverId, setDragOverId] = useState(null)
  const [coverOverride, setCoverOverride] = useState(null)
  const [removedTracks, setRemovedTracks] = useState({})
  const [extraTracks, setExtraTracks] = useState([])
  const [editingDur, setEditingDur] = useState(null)
  // criteria are held as raw text so "9." is typeable, and parsed on the way out
  const [criteriaText, setCriteriaText] = useState({})
  const [finalText, setFinalText] = useState('')
  const [nowPlaying, setNowPlaying] = useState('')
  const [albumNumber, setAlbumNumber] = useState(null)
  const [artistImages, setArtistImages] = useState([])
  const coverInputRef = useRef(null)
  const artistInputRef = useRef(null)
  const [tiers, setTiers] = useState({})
  const [offline, setOffline] = useState(false)
  const [showScale, setShowScale] = useState(false)
  const [saving, setSaving] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [savedAt, setSavedAt] = useState(null)
  const [err, setErr] = useState('')

  useEffect(() => {
    Promise.all([
      api.album(albumId).then(album => ({ album }), error => ({ error })),
      api.review(albumId).catch(() => null),
      api.tiers()
    ]).then(([fetched, review, tierLabels]) => {
      // Sources drop entries long after an album was rated — iTunes retires
      // collection ids all the time. The review carries a full snapshot of the
      // album, so fall back to that instead of dead-ending on a page you can
      // no longer open. Only a never-rated album can genuinely fail here.
      let alb = fetched.album
      if (!alb) {
        if (!review) throw fetched.error
        alb = {
          ...review.album,
          // extraTracks get appended to album.tracks below; the saved snapshot
          // already contains them, so they'd otherwise show up twice
          tracks: (review.album.tracks || []).filter(t => !String(t.id).startsWith('extra:'))
        }
        setOffline(true)
      }
      setAlbum(alb)
      setTiers(tierLabels)
      if (review) {
        setRatings(review.ratings || {})
        setSelections(review.selections || {})
        setThoughts(review.thoughts || '')
        setTitleOverrides(review.titleOverrides || {})
        setFeatureOverrides(review.featureOverrides || {})
        setRuntimeOverrideMs(review.runtimeOverrideMs || null)
        setGenreOverride(review.genreOverride || null)
        setArtistsOverride(review.artistsOverride || null)
        setNameOverride(review.nameOverride || null)
        setYearOverride(review.yearOverride || null)
        setOrderOverride(review.orderOverride || null)
        setCoverOverride(review.coverOverride || null)
        setRemovedTracks(Object.fromEntries((review.removedTracks || []).map(id => [id, true])))
        setExtraTracks(review.extraTracks || [])
        setCriteriaText(Object.fromEntries(
          CRITERIA.map(([k]) => [k, typeof review.criteria?.[k] === 'number' ? review.criteria[k].toFixed(1) : ''])
        ))
        setFinalText(typeof review.finalOverride === 'number' ? review.finalOverride.toFixed(1) : '')
        setNowPlaying(review.nowPlaying || '')
        setAlbumNumber(typeof review.albumNumber === 'number' ? review.albumNumber : null)
        setArtistImages(review.artistImages || [])
      }
    }).catch(e => setErr(e.message))
  }, [albumId])

  const allTracks = useMemo(() => {
    const base = album ? [...album.tracks, ...extraTracks] : []
    if (!orderOverride || !orderOverride.length) return base
    const byId = new Map(base.map(t => [t.id, t]))
    const ordered = orderOverride.map(id => byId.get(id)).filter(Boolean)
    const orderedIds = new Set(ordered.map(t => t.id))
    const rest = base.filter(t => !orderedIds.has(t.id))
    return [...ordered, ...rest]
  }, [album, extraTracks, orderOverride])
  const visibleTracks = useMemo(
    () => allTracks.filter(t => !removedTracks[t.id]),
    [allTracks, removedTracks]
  )
  const removedList = useMemo(
    () => allTracks.filter(t => removedTracks[t.id]),
    [allTracks, removedTracks]
  )

  const ratedCount = visibleTracks.filter(t => ratings[t.id] !== undefined).length
  const average = useMemo(() => {
    const vals = visibleTracks.map(t => ratings[t.id]).filter(v => typeof v === 'number')
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  }, [ratings, visibleTracks])

  const criteria = useMemo(() => {
    const out = {}
    for (const [k] of CRITERIA) {
      const v = parseScore(criteriaText[k] ?? '')
      if (v !== null) out[k] = v
    }
    return out
  }, [criteriaText])
  const finalOverride = parseScore(finalText)

  // The song average is one of six equally weighted inputs; criteria left blank
  // simply don't vote, so a half-filled album still gets a sensible number.
  const computedFinal = useMemo(() => {
    const vals = [average, ...CRITERIA.map(([k]) => criteria[k])].filter(v => typeof v === 'number')
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  }, [average, criteria])
  const finalScore = typeof finalOverride === 'number' ? finalOverride : computedFinal

  const computedRuntime = visibleTracks.reduce((a, t) => a + t.durationMs, 0)
  const runtime = runtimeOverrideMs ?? computedRuntime

  // Accepts "70" (minutes), "49:35" (mm:ss) or "1:10:23" (h:mm:ss)
  function parseRuntime (text) {
    const parts = text.trim().split(':').map(s => Number(s))
    if (!parts.length || parts.some(n => isNaN(n) || n < 0)) return null
    if (parts.length === 1) return parts[0] * 60000
    return parts.reduce((a, b) => a * 60 + b, 0) * 1000
  }

  const displayGenre = () => genreOverride ?? album?.genre
  const displayArtists = () => artistsOverride ?? album?.artists ?? []
  const displayAlbumName = () => nameOverride ?? album?.name
  const displayYear = () => yearOverride ?? album?.year

  function commitName (text) {
    const v = text.trim()
    setNameOverride(!v || v === album.name ? null : v)
    setEditingName(false)
  }

  function commitYear (text) {
    const v = text.trim()
    setYearOverride(!v || v === album.year ? null : v)
    setEditingYear(false)
  }

  function commitArtists (text) {
    const names = text.split(',').map(s => s.trim()).filter(Boolean)
    setArtistsOverride(!names.length || names.join('|') === album.artists.join('|') ? null : names)
    setEditingArtists(false)
  }

  function commitGenre (text) {
    const v = text.trim()
    setGenreOverride(!v || v === album.genre ? null : v)
    setEditingGenre(false)
  }

  function commitRuntime (text) {
    const v = text.trim()
    setRuntimeOverrideMs(v === '' ? null : (parseRuntime(v) ?? runtimeOverrideMs))
    setEditingRuntime(false)
  }
  const complete = album && visibleTracks.length > 0 && ratedCount === visibleTracks.length

  function addTrack () {
    const id = `extra:${Date.now()}`
    setExtraTracks(prev => [...prev, {
      id,
      name: '',
      durationMs: 0,
      trackNumber: allTracks.length + 1,
      discNumber: 1,
      artists: album.artists,
      features: []
    }])
    setEditingTitle(id)
  }

  const isExtra = t => t.id.startsWith('extra:')

  // Drop draggedId at targetId's position among visible tracks; hidden
  // (removed) tracks keep their relative spot in the underlying order.
  function reorderTo (draggedId, targetId) {
    if (draggedId === targetId) return
    const visibleIds = visibleTracks.map(x => x.id)
    const from = visibleIds.indexOf(draggedId)
    const to = visibleIds.indexOf(targetId)
    if (from === -1 || to === -1) return
    const newVisibleOrder = [...visibleIds]
    newVisibleOrder.splice(from, 1)
    newVisibleOrder.splice(to, 0, draggedId)
    setOrderOverride(prev => {
      const base = prev && prev.length ? prev : allTracks.map(x => x.id)
      const visibleSet = new Set(visibleIds)
      let insertPos = null
      const withoutVisible = []
      base.forEach(id => {
        if (visibleSet.has(id)) {
          if (insertPos === null) insertPos = withoutVisible.length
        } else {
          withoutVisible.push(id)
        }
      })
      const result = [...withoutVisible]
      result.splice(insertPos ?? result.length, 0, ...newVisibleOrder)
      return result
    })
  }

  // Swap a track with its visible neighbor; dir is -1 (up) or +1 (down)
  function moveTrack (t, dir) {
    const visibleIds = visibleTracks.map(x => x.id)
    const idx = visibleIds.indexOf(t.id)
    const swapIdx = idx + dir
    if (swapIdx < 0 || swapIdx >= visibleIds.length) return
    const otherId = visibleIds[swapIdx]
    setOrderOverride(prev => {
      const arr = prev && prev.length ? [...prev] : allTracks.map(x => x.id)
      const i1 = arr.indexOf(t.id)
      const i2 = arr.indexOf(otherId)
      ;[arr[i1], arr[i2]] = [arr[i2], arr[i1]]
      return arr
    })
  }

  function commitDuration (t, text) {
    const parts = text.trim().split(':').map(Number)
    const ms = text.trim() && !parts.some(isNaN) ? parts.reduce((a, b) => a * 60 + b, 0) * 1000 : 0
    setExtraTracks(prev => prev.map(x => x.id === t.id ? { ...x, durationMs: ms } : x))
    setEditingDur(null)
  }

  // Downscale the chosen image so the stored data URL stays a reasonable size
  function onCoverFile (e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const size = Math.min(1000, Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      // cover-fit into a square
      const s = Math.max(size / img.width, size / img.height)
      ctx.drawImage(img, (size - img.width * s) / 2, (size - img.height * s) / 2, img.width * s, img.height * s)
      setCoverOverride(canvas.toDataURL('image/jpeg', 0.85))
      URL.revokeObjectURL(url)
    }
    img.onerror = () => { setErr('Could not read that image'); URL.revokeObjectURL(url) }
    img.src = url
  }

  const displayName = t => titleOverrides[t.id] || t.name || 'Untitled'
  const displayFeatures = t => featureOverrides[t.id] ?? t.features

  function commitFeatures (t, value) {
    const names = value.split(',').map(s => s.trim()).filter(Boolean)
    setFeatureOverrides(prev => {
      const next = { ...prev }
      if (names.join('|') === t.features.join('|')) delete next[t.id]
      else next[t.id] = names
      return next
    })
    setEditingFeat(null)
  }

  function commitTitle (t, value) {
    const v = value.trim()
    setTitleOverrides(prev => {
      const next = { ...prev }
      if (!v || v === t.name) delete next[t.id]
      else next[t.id] = v
      return next
    })
    setEditingTitle(null)
  }

  async function save (goExport) {
    if (!album) return
    setSaving(true)
    setErr('')
    try {
      await api.saveReview(albumId, {
        album: {
          id: album.id, name: displayAlbumName(), artists: displayArtists(),
          releaseDate: album.releaseDate, year: displayYear(), genre: displayGenre(),
          cover: coverOverride || album.cover,
          coverSmall: coverOverride || album.coverSmall,
          runtimeMs: runtime,
          tracks: visibleTracks.map((t, i) => ({ ...t, name: displayName(t), features: displayFeatures(t), trackNumber: i + 1 }))
        },
        // drop ratings that belong to removed tracks so they don't skew the average
        ratings: Object.fromEntries(visibleTracks.filter(t => ratings[t.id] !== undefined).map(t => [t.id, ratings[t.id]])),
        criteria, finalOverride, nowPlaying, albumNumber, artistImages,
        selections, thoughts, titleOverrides, featureOverrides, runtimeOverrideMs, genreOverride,
        coverOverride, artistsOverride, nameOverride, yearOverride, orderOverride,
        removedTracks: Object.keys(removedTracks).filter(k => removedTracks[k]),
        extraTracks
      })
      setSavedAt(Date.now())
      if (goExport) nav(`/export/${albumId}`)
    } catch (e) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function saveTierLabel (score, text) {
    const next = { ...tiers, [score]: text }
    setTiers(next)
    api.saveTiers({ [score]: text }).catch(() => {})
  }

  // Re-pull album data from the source (iTunes/Discogs/Spotify); ratings and
  // manual edits are keyed by track id, so they survive the refresh
  async function refreshAlbum () {
    setRefreshing(true)
    setErr('')
    try {
      setAlbum(await api.album(albumId))
      setSavedAt(null) // remind that the refreshed data still needs a Save
    } catch (e) {
      setErr(e.message)
    } finally {
      setRefreshing(false)
    }
  }

  async function onArtistFiles (e) {
    const files = [...(e.target.files || [])]
    e.target.value = ''
    if (!files.length) return
    try {
      const added = await Promise.all(files.slice(0, 3).map(readArtistPng))
      setArtistImages(prev => [...prev, ...added.map(src => ({ src, scale: 1, x: 0, y: 0 }))].slice(0, 3))
    } catch (e2) {
      setErr(e2.message)
    }
  }

  function nudgeArtist (i, patch) {
    setArtistImages(prev => prev.map((a, j) => j === i ? { ...a, ...patch } : a))
  }

  if (err && !album) return <div className="app"><div className="muted">{err}</div></div>
  if (!album) return <div className="app"><span className="spin" /></div>

  const avgColor = average !== null ? ratingColor(Math.round(average)) : ratingColor(null)
  const finalColor = finalScore !== null ? ratingColor(Math.round(finalScore)) : ratingColor(null)

  return (
    <div className="app">
      <div className="nav">
        <button className="pill" onClick={() => nav('/')}>‹ Back</button>
        <div style={{ display: 'flex', gap: 8 }}>
          {!albumId.startsWith('manual:') && !offline && (
            <button className="pill" disabled={refreshing} onClick={refreshAlbum} title="Re-fetch tracklist, cover and genre from the source">
              {refreshing ? 'Refreshing…' : '↻ Refresh Data'}
            </button>
          )}
          <button className="pill" onClick={() => setShowScale(s => !s)}>
            {showScale ? 'Hide Scale' : 'Rating Scale'}
          </button>
        </div>
      </div>

      {offline && (
        <div className="notice">
          This album is no longer listed by its source, so your saved copy is being
          shown. Everything still edits and exports normally — just don&rsquo;t use
          Refresh Data, as there&rsquo;s nothing left to refresh from.
        </div>
      )}

      <div className="rate-header">
        <input ref={coverInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={onCoverFile} />
        <div className="cover-wrap" title="Click to upload a custom cover">
          <img
            src={coverOverride || proxyImg(album.cover)} alt=""
            onClick={() => coverInputRef.current?.click()}
          />
          <div className="cover-hint">✎</div>
          {coverOverride && (
            <button className="cover-reset" title="Reset to original cover" onClick={() => setCoverOverride(null)}>↺</button>
          )}
        </div>
        <div>
          {editingName ? (
            <input
              className="runtime-input" autoFocus
              style={{ width: '100%', maxWidth: 320, fontSize: 22, fontWeight: 800 }}
              placeholder="Album title"
              defaultValue={displayAlbumName()}
              onBlur={e => commitName(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') commitName(e.target.value)
                if (e.key === 'Escape') setEditingName(false)
              }}
            />
          ) : (
            <h2
              className="runtime-editable" style={{ display: 'inline-block' }}
              title="Click to edit album title"
              onClick={() => setEditingName(true)}
            >
              {displayAlbumName()}{nameOverride != null && ' ✎'}
            </h2>
          )}
          {editingArtists ? (
            <input
              className="runtime-input" autoFocus
              style={{ width: '100%', maxWidth: 320, fontSize: 15, marginTop: 4 }}
              placeholder="Artist(s), comma-separated"
              defaultValue={displayArtists().join(', ')}
              onBlur={e => commitArtists(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') commitArtists(e.target.value)
                if (e.key === 'Escape') setEditingArtists(false)
              }}
            />
          ) : (
            <div
              className="artist runtime-editable"
              style={{ display: 'inline-block' }}
              title="Click to edit artist name(s)"
              onClick={() => setEditingArtists(true)}
            >
              {displayArtists().join(', ')}{artistsOverride != null && ' ✎'}
            </div>
          )}
          <div className="detail">
            {editingYear ? (
              <input
                className="runtime-input" autoFocus
                style={{ width: 70 }}
                placeholder="Year"
                defaultValue={displayYear() || ''}
                onBlur={e => commitYear(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitYear(e.target.value)
                  if (e.key === 'Escape') setEditingYear(false)
                }}
              />
            ) : (
              <span
                className="runtime-editable"
                title="Click to edit year"
                onClick={() => setEditingYear(true)}
              >
                {displayYear() || 'add year'}{yearOverride != null && ' ✎'}
              </span>
            )}
            {' '}·{' '}
            {editingGenre ? (
              <input
                className="runtime-input" autoFocus
                placeholder="Genre"
                defaultValue={displayGenre() || ''}
                onBlur={e => commitGenre(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitGenre(e.target.value)
                  if (e.key === 'Escape') setEditingGenre(false)
                }}
              />
            ) : (
              <span
                className="runtime-editable"
                title="Click to edit genre (clear to reset)"
                onClick={() => setEditingGenre(true)}
              >
                {displayGenre() || 'add genre'}{genreOverride != null && ' ✎'}
              </span>
            )}
            {' '}· {visibleTracks.length} songs ·{' '}
            {editingRuntime ? (
              <input
                className="runtime-input" autoFocus
                placeholder="e.g. 70 or 1:10:23"
                defaultValue={runtimeOverrideMs ? Math.round(runtimeOverrideMs / 60000) : ''}
                onBlur={e => commitRuntime(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitRuntime(e.target.value)
                  if (e.key === 'Escape') setEditingRuntime(false)
                }}
              />
            ) : (
              <span
                className="runtime-editable"
                title="Click to set album length manually (clear to reset)"
                onClick={() => setEditingRuntime(true)}
              >
                {fmtRuntime(runtime)}{runtimeOverrideMs != null && ' ✎'}
              </span>
            )}
          </div>
        </div>
      </div>

      {showScale && (
        <div className="card" style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 10 }}>
            Edit the label for each score tier — used across the app and exports.
          </div>
          <div className="scale-list">
            {[...SCALE_ROWS, SKIT].map(s => {
              const c = ratingColor(s)
              return (
                <div className="scale-row" key={s}>
                  <span className="score-chip" style={{ background: c.bg, color: c.fg }}>{scoreText(s)}</span>
                  <input value={tiers[s] || ''} onChange={e => saveTierLabel(s, e.target.value)} />
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="avg-banner">
        <span className="label">
          Song Average · {ratedCount}/{visibleTracks.length} rated
        </span>
        <span className="score-chip" style={{ background: avgColor.bg, color: avgColor.fg }}>
          {average !== null ? average.toFixed(1) : '—'}
        </span>
        <span className="label" style={{ marginLeft: 'auto' }}>Final Rating</span>
        <span className="score-chip big" style={{ background: finalColor.bg, color: finalColor.fg }}>
          {fmtScore(finalScore)}
        </span>
      </div>

      <div className="card">
        {visibleTracks.map((t, i) => {
          const r = ratings[t.id]
          const c = ratingColor(r)
          return (
            <div
              className={`track-item${dragId === t.id ? ' dragging' : ''}${dragOverId === t.id && dragId !== t.id ? ' drag-over' : ''}`}
              key={t.id}
              draggable
              onDragStart={() => setDragId(t.id)}
              onDragOver={e => { e.preventDefault(); if (dragOverId !== t.id) setDragOverId(t.id) }}
              onDragLeave={() => setDragOverId(prev => prev === t.id ? null : prev)}
              onDrop={e => { e.preventDefault(); if (dragId) reorderTo(dragId, t.id); setDragId(null); setDragOverId(null) }}
              onDragEnd={() => { setDragId(null); setDragOverId(null) }}
            >
              <span className="drag-handle" title="Drag to reorder">⠿</span>
              <span className="num">{i + 1}</span>
              <div className="reorder-btns">
                <button
                  className="reorder-btn" disabled={i === 0}
                  title="Move up" onClick={() => moveTrack(t, -1)}
                >▲</button>
                <button
                  className="reorder-btn" disabled={i === visibleTracks.length - 1}
                  title="Move down" onClick={() => moveTrack(t, 1)}
                >▼</button>
              </div>
              <div className="t-meta">
                {editingTitle === t.id ? (
                  <input
                    className="t-name-input" autoFocus
                    defaultValue={displayName(t)}
                    onBlur={e => commitTitle(t, e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitTitle(t, e.target.value)
                      if (e.key === 'Escape') setEditingTitle(null)
                    }}
                  />
                ) : (
                  <div
                    className="t-name editable"
                    title="Click to edit title"
                    onClick={() => setEditingTitle(t.id)}
                  >
                    {displayName(t)}
                    {titleOverrides[t.id] && <span className="t-edited">edited</span>}
                  </div>
                )}
                {editingFeat === t.id ? (
                  <input
                    className="t-name-input" autoFocus
                    style={{ marginTop: 3, fontSize: 13 }}
                    placeholder="Features, comma-separated"
                    defaultValue={displayFeatures(t).join(', ')}
                    onBlur={e => commitFeatures(t, e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitFeatures(t, e.target.value)
                      if (e.key === 'Escape') setEditingFeat(null)
                    }}
                  />
                ) : displayFeatures(t).length > 0 ? (
                  <div
                    className="t-feat editable" title="Click to edit features"
                    onClick={() => setEditingFeat(t.id)}
                  >
                    feat. {displayFeatures(t).join(', ')}
                    {featureOverrides[t.id] && <span className="t-edited">edited</span>}
                  </div>
                ) : (
                  <div
                    className="t-feat add-feat" title="Add features to this track"
                    onClick={() => setEditingFeat(t.id)}
                  >+ feat.</div>
                )}
              </div>
              {isExtra(t) && editingDur === t.id ? (
                <input
                  className="runtime-input" autoFocus
                  style={{ width: 60, textAlign: 'center' }}
                  placeholder="3:45"
                  defaultValue={t.durationMs ? fmtDuration(t.durationMs) : ''}
                  onBlur={e => commitDuration(t, e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') commitDuration(t, e.target.value)
                    if (e.key === 'Escape') setEditingDur(null)
                  }}
                />
              ) : (
                <span
                  className={`t-dur${isExtra(t) ? ' runtime-editable' : ''}`}
                  title={isExtra(t) ? 'Click to set duration' : undefined}
                  onClick={isExtra(t) ? () => setEditingDur(t.id) : undefined}
                >{fmtDuration(t.durationMs)}</span>
              )}
              <select
                className="rating-select"
                style={r !== undefined ? { background: c.bg, color: c.fg } : {}}
                value={r ?? ''}
                onChange={e => {
                  const v = e.target.value
                  setRatings(prev => {
                    const next = { ...prev }
                    if (v === '') delete next[t.id]
                    else next[t.id] = v === SKIT ? SKIT : Number(v)
                    return next
                  })
                }}
              >
                <option value="">—</option>
                {SCALE_ROWS.map(s => (
                  <option key={s} value={s}>{s} · {tiers[s] || ''}</option>
                ))}
                <option value={NA}>– · {tiers[SKIT] || 'N/A'}</option>
              </select>
              <button
                className="track-remove" title={isExtra(t) ? 'Delete this added track' : 'Remove this track from the review'}
                onClick={() => {
                  if (isExtra(t)) setExtraTracks(prev => prev.filter(x => x.id !== t.id))
                  else setRemovedTracks(prev => ({ ...prev, [t.id]: true }))
                }}
              >✕</button>
            </div>
          )
        })}
        <button className="pill" style={{ marginTop: 12 }} onClick={addTrack}>+ Add Track</button>
      </div>

      {removedList.length > 0 && (
        <>
          <div className="section-title">Removed Tracks</div>
          <div className="card">
            {removedList.map(t => (
              <div className="track-item" key={t.id}>
                <span className="num">{t.trackNumber}</span>
                <div className="t-meta">
                  <div className="t-name" style={{ color: 'var(--text-3)', textDecoration: 'line-through' }}>{displayName(t)}</div>
                </div>
                <button
                  className="pill" style={{ padding: '5px 12px', fontSize: 13 }}
                  onClick={() => setRemovedTracks(prev => {
                    const next = { ...prev }
                    delete next[t.id]
                    return next
                  })}
                >Restore</button>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="section-title">Rating Criteria</div>
      <div className="card">
        <div className="criteria-grid">
          <div className="criterion auto">
            <label>Song Average</label>
            <div className="criterion-auto-value">{average !== null ? average.toFixed(1) : '—'}</div>
            <span className="criterion-note">calculated</span>
          </div>
          {CRITERIA.map(([key, label]) => {
            const bad = (criteriaText[key] ?? '').trim() !== '' && parseScore(criteriaText[key]) === null
            return (
              <div className="criterion" key={key}>
                <label>{label}</label>
                <input
                  className={`criterion-input${bad ? ' bad' : ''}`}
                  inputMode="decimal" placeholder="—"
                  value={criteriaText[key] ?? ''}
                  onChange={e => setCriteriaText(prev => ({ ...prev, [key]: e.target.value }))}
                />
                <span className="criterion-note">0.0 – 11.0</span>
              </div>
            )
          })}
        </div>

        <div className="final-row">
          <div>
            <div className="final-label">Final Rating</div>
            <div className="final-hint">
              {typeof finalOverride === 'number'
                ? `overriding the calculated ${fmtScore(computedFinal)}`
                : 'mean of the song average and every filled criterion'}
            </div>
          </div>
          <input
            className="criterion-input override"
            inputMode="decimal" placeholder="auto"
            title="Leave blank to use the calculated mean"
            value={finalText}
            onChange={e => setFinalText(e.target.value)}
          />
          <span className="score-chip big" style={{ background: finalColor.bg, color: finalColor.fg }}>
            {fmtScore(finalScore)}
          </span>
        </div>
      </div>

      <div className="section-title">Highlights</div>
      <div className="card">
        <div className="selectors-grid">
          {SELECTORS.map(([key, label]) => (
            <div className="field" key={key}>
              <label>{label}</label>
              <select
                value={selections[key] || ''}
                onChange={e => setSelections(s => ({ ...s, [key]: e.target.value }))}
              >
                <option value="">Select a track…</option>
                {visibleTracks.map(t => <option key={t.id} value={displayName(t)}>{displayName(t)}</option>)}
              </select>
            </div>
          ))}
          <div className="field">
            <label>Now Playing</label>
            <select value={nowPlaying} onChange={e => setNowPlaying(e.target.value)}>
              <option value="">No player on the criteria image</option>
              {visibleTracks.map(t => <option key={t.id} value={t.id}>{displayName(t)}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="section-title">Title Card</div>
      <div className="card">
        <div className="field" style={{ maxWidth: 260 }}>
          <label>Album number</label>
          <input
            inputMode="numeric" placeholder="auto (order rated)"
            value={albumNumber ?? ''}
            onChange={e => {
              const v = e.target.value.trim()
              setAlbumNumber(v === '' || isNaN(Number(v)) ? null : Math.round(Number(v)))
            }}
          />
        </div>

        <input
          ref={artistInputRef} type="file" accept="image/png,image/*" multiple
          style={{ display: 'none' }} onChange={onArtistFiles}
        />
        <div className="artist-imgs">
          {artistImages.map((img, i) => (
            <div className="artist-img" key={i}>
              <img src={img.src} alt="" />
              <div className="artist-img-ctl">
                <label>Size</label>
                <input
                  type="range" min="0.5" max="1.8" step="0.02"
                  value={img.scale ?? 1}
                  onChange={e => nudgeArtist(i, { scale: Number(e.target.value) })}
                />
                <label>Across</label>
                <input
                  type="range" min="-380" max="380" step="5"
                  value={img.x ?? 0}
                  onChange={e => nudgeArtist(i, { x: Number(e.target.value) })}
                />
                <label>Up</label>
                <input
                  type="range" min="-80" max="260" step="5"
                  value={img.y ?? 0}
                  onChange={e => nudgeArtist(i, { y: Number(e.target.value) })}
                />
              </div>
              <button
                className="row-delete"
                title="Remove this cut-out"
                onClick={() => setArtistImages(prev => prev.filter((_, j) => j !== i))}
              >✕</button>
            </div>
          ))}
          {artistImages.length < 3 && (
            <button className="pill artist-add" onClick={() => artistInputRef.current?.click()}>
              + Artist PNG
            </button>
          )}
        </div>
        <div className="muted" style={{ padding: '10px 0 0', fontSize: 13 }}>
          Transparent PNGs sit inside the glass dome on the first image. Up to three.
        </div>
      </div>

      {err && <div className="err" style={{ marginTop: 12 }}>{err}</div>}

      <div className="save-bar">
        <button className="btn-save" disabled={saving || ratedCount === 0} onClick={() => save(false)}>
          {saving ? 'Saving…' : savedAt ? 'Saved ✓' : 'Save'}
        </button>
        <button className="btn-export" disabled={!complete || saving} onClick={() => save(true)}>
          {complete ? 'Generate Images →' : `Rate all tracks (${ratedCount}/${album.tracks.length})`}
        </button>
      </div>
    </div>
  )
}
