'use client'

import { useEffect, useRef, useState } from 'react'
import { usePlayer } from './audio/Player'
import { dominant } from '../lib/palette'

// The hero is a listening station, not a product card. A sleeve with the record
// half out of it: press it and the disc spins, the room takes the cover's colour,
// and the scoring panel beside it fills in time with the preview.
const CRITERIA = ['Lyricism', 'Production', 'Delivery', 'Album experience', 'Replay value']

export default function Hero ({ albums = [], children }) {
  const { track, playing, play, progress } = usePlayer()
  const [album, setAlbum] = useState(albums[0] || null)
  const stage = useRef(null)
  const art = useRef(null)

  // Randomise after mount so server and client markup cannot disagree.
  useEffect(() => {
    if (albums.length > 1) setAlbum(albums[Math.floor(Math.random() * albums.length)])
  }, [albums])

  // Before anything plays, the room is still lit by the record on the stand.
  useEffect(() => {
    if (track || !album) return
    const img = art.current
    if (!img) return
    const paint = () => {
      const rgb = dominant(img)
      if (!rgb) return
      const r = document.documentElement
      r.style.setProperty('--accent', `rgb(${rgb})`)
      r.style.setProperty('--accent-rgb', rgb)
      r.style.setProperty('--accent-soft', `rgba(${rgb}, 0.34)`)
    }
    if (img.complete) paint()
    else img.addEventListener('load', paint, { once: true })
  }, [album, track])

  // The light follows the cursor across the stage.
  useEffect(() => {
    const el = stage.current
    if (!el) return
    let raf = 0
    const move = e => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect()
        el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width - 0.5).toFixed(3)}`)
        el.style.setProperty('--my', `${((e.clientY - r.top) / r.height - 0.5).toFixed(3)}`)
      })
    }
    const reset = () => { el.style.setProperty('--mx', '0'); el.style.setProperty('--my', '0') }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerleave', reset)
    return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', reset); cancelAnimationFrame(raf) }
  }, [])

  if (!album) return null
  const live = track?.dz === album.dz
  const spinning = live && playing
  // At rest the panel shows a finished review; pressing play re-scores it live, so
  // the resting state is never a wall of zeroes.
  // Eased so the panel reads as a rating settling, not a bar creeping from zero.
  const filled = live ? Math.pow(progress, 0.4) : 1

  return (
    <header className="hero" ref={stage}>
      <div className="hero-inner">
        <div className="hero-copy">
          <h1 className="display hero-h1">
            Say what you<br /><em>actually</em> think.
          </h1>
          <p className="hero-sub measure">
            Score an album track by track, publish the review, and argue about it with people
            who care as much as you do. Every rating comes out the other side as a set of
            slides built for TikTok.
          </p>
          <div className="hero-cta">{children}</div>
        </div>

        <div className="hero-stage">
          <div className={`rig${spinning ? ' spinning' : ''}${live ? ' out' : ''}`}>
            <div className="disc" aria-hidden="true">
              <div className="disc-face" />
              <img className="disc-label" src={album.cover} alt="" />
              <div className="disc-spindle" />
            </div>

            <button
              className="sleeve"
              onClick={() => play(album)}
              aria-label={spinning ? `Pause ${album.name}` : `Play a preview of ${album.name} by ${album.artist}`}
            >
              <img ref={art} className="sleeve-art" src={album.cover} alt="" crossOrigin="anonymous" />
              <span className="sleeve-gloss" aria-hidden="true" />
              <span className="sleeve-btn" aria-hidden="true">
                {spinning
                  ? <svg viewBox="0 0 24 24"><rect x="7" y="5.5" width="3.4" height="13" rx="1.2" /><rect x="13.6" y="5.5" width="3.4" height="13" rx="1.2" /></svg>
                  : <svg viewBox="0 0 24 24"><path d="M8.5 5.6v12.8a.8.8 0 0 0 1.22.68l10.1-6.4a.8.8 0 0 0 0-1.36L9.72 4.92a.8.8 0 0 0-1.22.68Z" /></svg>}
              </span>
            </button>
          </div>

          <div className="card">
            <div className="card-head">
              <strong>{album.name}</strong>
              <span>{album.artist}</span>
            </div>
            <ul className="card-rows">
              {CRITERIA.map((c, i) => {
                const target = [0.86, 0.94, 0.8, 0.9, 0.83][i]
                const v = Math.min(1, Math.max(0, (filled - i * 0.06) / 0.5)) * target
                return (
                  <li key={c}>
                    <span>{c}</span>
                    <i><b style={{ transform: `scaleX(${v.toFixed(3)})` }} /></i>
                    <em>{(v * 11).toFixed(1)}</em>
                  </li>
                )
              })}
            </ul>
            <div className="card-final">
              <span>Final</span>
              <strong className="tnum">{(filled * 9.4).toFixed(1)}</strong>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
