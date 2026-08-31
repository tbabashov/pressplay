import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api.js'
import { extractPalette, fallbackPalette, paletteFromColor } from '../colors.js'
import { embedder } from '../export/embed.js'
import { useTheme, ThemeBar, SongTextBar, FramesStrip, useFrameDownloader } from '../export/exportUI.jsx'
import {
  TitleFrame, TracksFrame, CriteriaFrame, ComparisonFrame, DiscographyFrame
} from '../export/frames.jsx'

// Songs per image on Auto. 14 keeps the rows big and comfortably clear of the
// caption band; the count is then levelled across pages so a 17-track album
// splits 9 + 8 rather than 14 + 3.
const AUTO_PER_PAGE = 14
const DISCO_PER_PAGE = 9

// `level` shares the items out evenly across the fewest pages that fit under
// `max`. That is what Auto wants, but it must NOT apply to an explicit choice:
// levelling 17 songs turns both "10" and "14" into 9 per page, which makes the
// buttons look like they do nothing.
function paginate (items, max, level = false) {
  if (items.length <= max) return items.length ? [items] : []
  const per = level ? Math.ceil(items.length / Math.ceil(items.length / max)) : max
  const out = []
  for (let i = 0; i < items.length; i += per) out.push(items.slice(i, i + per))
  return out
}

const PER_PAGE_OPTIONS = [0, 10, 12, 14, 16, 18]
const PER_PAGE_MAX = 40

// Where the rating scale appears: nowhere, on the last song image only, or
// repeated on every one of them.
const SCALE_PLACEMENTS = [['off', 'Off'], ['last', 'Last image'], ['all', 'Every image']]

const DEFAULT_OPTS = { perPage: 0, scale: 'off', discography: 'on' }

const validPerPage = v =>
  Number.isInteger(v) && (v === 0 || (v >= 1 && v <= PER_PAGE_MAX))

function loadOpts () {
  try {
    const saved = { ...DEFAULT_OPTS, ...JSON.parse(localStorage.getItem('exportOpts') || '{}') }
    if (!validPerPage(saved.perPage)) saved.perPage = 0
    // 'on' was the old two-state scale toggle; 'own'/'img2' the placements
    // before that. Map what still means something and reset the rest.
    if (saved.scale === 'on' || saved.scale === 'own' || saved.scale === 'img2') saved.scale = 'last'
    if (!SCALE_PLACEMENTS.some(([v]) => v === saved.scale)) saved.scale = DEFAULT_OPTS.scale
    if (saved.discography !== 'on' && saved.discography !== 'off') saved.discography = 'on'
    return saved
  } catch { return { ...DEFAULT_OPTS } }
}

export default function ExportPage () {
  const { albumId } = useParams()
  const nav = useNavigate()
  const [data, setData] = useState(null)
  const [palette, setPalette] = useState(null)
  const [autoPalette, setAutoPalette] = useState(null)
  const [pickedColor, setPickedColor] = useState(undefined)
  const [opts, setOpts] = useState(loadOpts)
  // the custom box holds raw text so a two-digit number can be typed a digit at
  // a time without the field clearing itself when the first digit is a preset
  const [custom, setCustom] = useState(
    () => PER_PAGE_OPTIONS.includes(loadOpts().perPage) ? '' : String(loadOpts().perPage)
  )
  const [theme, setTheme] = useTheme()
  const [showSafe, setShowSafe] = useState(false)
  // locked = the cut-out is pinned where it is; unlocked shows the transform box
  const [lockCutouts, setLockCutouts] = useState(
    () => localStorage.getItem('lockCutouts') === '1'
  )
  const [err, setErr] = useState('')
  const frameRefs = useRef([])
  // artist cut-outs are dragged live on the preview; the ref is the source of
  // truth during a drag so rapid pointer moves can't read a stale render
  const [artistImages, setArtistImages] = useState([])
  const imagesRef = useRef([])
  const saveTimer = useRef(null)

  function setOpt (key, value) {
    setOpts(prev => {
      const next = { ...prev, [key]: value }
      localStorage.setItem('exportOpts', JSON.stringify(next))
      return next
    })
  }

  useEffect(() => {
    api.exportData(albumId).then(async d => {
      // Embed every cover as a data URL up front. The frames then contain no
      // external resources, so the PNG capture can't fetch (and mix up) images.
      const embed = embedder()
      d.review.album.coverProxied = await embed(d.review.album.cover)
      for (const e of d.ladder) {
        if (!e.gap) e.coverProxied = await embed(e.album.coverSmall || e.album.cover)
      }
      for (const g of d.discographies) {
        for (const a of g.albums) a.cover = await embed(a.cover)
      }
      setData(d)
      imagesRef.current = d.review.artistImages || []
      setArtistImages(imagesRef.current)
      const auto = await extractPalette(d.review.album.coverProxied).catch(() => fallbackPalette())
      setAutoPalette(auto)
      if (d.review.paletteColor) {
        const p = paletteFromColor(d.review.paletteColor)
        p.swatches = auto.swatches
        setPalette(p)
        setPickedColor(d.review.paletteColor)
      } else {
        setPalette(auto)
        setPickedColor(null)
      }
    }).catch(e => setErr(e.message))
  }, [albumId])

  function pickSwatch (c) {
    if (!data) return
    let p
    if (c === null) {
      p = autoPalette
    } else {
      p = paletteFromColor(c)
      p.swatches = autoPalette?.swatches || []
    }
    setPalette(p)
    setPickedColor(c)
    // persist the choice on the review
    const r = data.review
    api.saveReview(albumId, { ...r, paletteColor: c }).catch(() => {})
  }

  // Nudging a cut-out shouldn't hammer the API, so the write is debounced —
  // but the preview follows the pointer immediately.
  function updateArtistImage (i, patch) {
    const next = imagesRef.current.map((a, j) => j === i ? { ...a, ...patch } : a)
    imagesRef.current = next
    setArtistImages(next)
    clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(() => {
      api.saveReview(albumId, { ...data.review, artistImages: next }).catch(() => {})
    }, 500)
  }

  useEffect(() => () => clearTimeout(saveTimer.current), [])

  const frames = useMemo(() => {
    if (!data || !palette) return []
    const list = [{
      key: 'title',
      node: (
        <TitleFrame
          data={data} palette={palette} theme={theme}
          images={artistImages} onImageChange={updateArtistImage}
          lockCutouts={lockCutouts}
        />
      )
    }]

    const auto = !opts.perPage
    const pages = paginate(data.review.album.tracks, opts.perPage || AUTO_PER_PAGE, auto)
    // one decision for the whole album, so a 14-song page and a 3-song page
    // don't come out in two different type sizes
    const dense = Math.max(...pages.map(p => p.length), 0) > 14
    pages.forEach((tracks, i) => {
      list.push({
        key: `tracks-${i}`,
        node: (
          <TracksFrame
            data={data} palette={palette} theme={theme} tracks={tracks} dense={dense}
            showScale={opts.scale === 'all' || (opts.scale === 'last' && i === pages.length - 1)}
          />
        )
      })
    })

    list.push({ key: 'criteria', node: <CriteriaFrame data={data} palette={palette} theme={theme} /> })
    list.push({ key: 'comparison', node: <ComparisonFrame data={data} palette={palette} theme={theme} /> })

    if (opts.discography === 'on') {
      // one artist per image, never two — long discographies just add pages
      for (const g of data.discographies) {
        const pages = paginate(g.albums, DISCO_PER_PAGE, true)
        pages.forEach((albums, i) => {
          list.push({
            key: `disco-${g.artist}-${i}`,
            node: (
              <DiscographyFrame
                group={{ artist: g.artist, albums }} page={i + 1} pages={pages.length}
                currentAlbumName={data.review.album.name}
                palette={palette} theme={theme}
              />
            )
          })
        })
      }
    }
    return list
  }, [data, palette, theme, opts, artistImages, lockCutouts])

  const slug = data?.review.album.name.replace(/[^\w]+/g, '-').toLowerCase() || 'album'
  const { downloading, downloadAll } = useFrameDownloader(frameRefs, slug, setErr)

  if (err && !data) return <div className="app"><div className="muted">{err}</div></div>
  if (!data || !palette) return <div className="app"><span className="spin" /></div>

  return (
    <div className="app" style={{ maxWidth: 1100 }}>
      <div className="nav">
        <button className="pill" onClick={() => nav('/')}>‹ Home</button>
        <div className="links">
          <button className="pill" onClick={() => nav('/discography')}>Discographies</button>
          <button className="pill" onClick={() => nav(`/rate/${albumId}`)}>Edit Ratings</button>
          <button className="pill tint" disabled={downloading} onClick={downloadAll}>
            {downloading ? 'Exporting…' : `Download All (${frames.length} PNGs)`}
          </button>
        </div>
      </div>

      {err && <div className="err" style={{ marginBottom: 12 }}>{err}</div>}

      <div className="opts-row">
        <span className="swatch-label">Songs / image</span>
        <div className="source-tabs">
          {PER_PAGE_OPTIONS.map(val => (
            <button
              key={val}
              className={`source-tab${opts.perPage === val ? ' active' : ''}`}
              onClick={() => { setCustom(''); setOpt('perPage', val) }}
            >{val === 0 ? 'Auto' : val}</button>
          ))}
        </div>
        <input
          className="mini-num"
          inputMode="numeric" placeholder="Custom"
          title={`Any number of songs per image, 1–${PER_PAGE_MAX} (rows shrink to fit)`}
          value={custom}
          onChange={e => {
            const text = e.target.value.replace(/[^\d]/g, '').slice(0, 2)
            setCustom(text)
            const n = Number(text)
            if (text === '') setOpt('perPage', 0)
            else if (n >= 1) setOpt('perPage', Math.min(PER_PAGE_MAX, n))
          }}
        />
        {artistImages.length > 0 && (
          <button
            className={`toggle-chip${lockCutouts ? ' on' : ''}`}
            title="Pin the artist cut-out where it is. Unlock to get the resize box."
            onClick={() => {
              const next = !lockCutouts
              setLockCutouts(next)
              localStorage.setItem('lockCutouts', next ? '1' : '0')
            }}
          >{lockCutouts ? '🔒 Cut-out locked' : '🔓 Cut-out unlocked'}</button>
        )}
        <button
          className={`toggle-chip${opts.discography === 'on' ? ' on' : ''}`}
          onClick={() => setOpt('discography', opts.discography === 'on' ? 'off' : 'on')}
        >Discography images: {opts.discography === 'on' ? 'On' : 'Off'}</button>
      </div>

      <div className="opts-row">
        <span className="swatch-label">Rating scale</span>
        <div className="source-tabs">
          {SCALE_PLACEMENTS.map(([val, label]) => (
            <button
              key={val}
              className={`source-tab${opts.scale === val ? ' active' : ''}`}
              onClick={() => setOpt('scale', val)}
            >{label}</button>
          ))}
        </div>
      </div>

      <ThemeBar
        theme={theme} setTheme={setTheme}
        showSafe={showSafe} setShowSafe={setShowSafe}
        palette={palette} pickedColor={pickedColor} onPickSwatch={pickSwatch}
      />

      <SongTextBar theme={theme} setTheme={setTheme} />

      <FramesStrip frames={frames} frameRefs={frameRefs} showSafe={showSafe} />

      <div className="muted" style={{ paddingTop: 0 }}>
        {frames.length} images · 1080 × 1920 · scroll sideways to preview
        {artistImages.length > 0 && (
          <><br />{lockCutouts
            ? 'Artist cut-out is locked in place — unlock it to move or resize.'
            : 'Drag the cut-out on image 1 to move it, drag a corner handle or scroll to resize, double-click to reset.'}</>
        )}
      </div>
    </div>
  )
}
