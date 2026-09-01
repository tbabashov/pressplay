'use client'

import { useEffect, useRef, useState } from 'react'
import { usePlayer } from './audio/Player'
import { dominant } from '../lib/palette'

// The hero is a listening station, not a product card. A sleeve with the record
// half out of it: press it and the disc spins, the room takes the cover's colour,
// and the scoring panel beside it fills in time with the preview.
const CRITERIA = ['Lyricism', 'Production', 'Delivery', 'Album experience', 'Replay value']

// The panel is a demonstration, so the numbers have to move when the record
// does. They are seeded from the album title rather than Math.random: the same
// sleeve always shows the same card, server and client agree on the first
// render, and nothing reshuffles on every repaint.
const seedOf = str => {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) }
  return h >>> 0
}

const noise = (seed, n) => {
  let x = (seed + n * 0x9e3779b9) >>> 0
  x = Math.imul(x ^ (x >>> 16), 0x21f0aaad)
  x = Math.imul(x ^ (x >>> 15), 0x735a2d97)
  return ((x ^ (x >>> 15)) >>> 0) / 4294967296
}

// Kept in the upper half of the scale: these stand in for a record someone
// cared enough to write about, not a random draw across the whole ladder.
const scoresFor = name => {
  const seed = seedOf(name || 'untitled')
  const values = CRITERIA.map((_, i) => Math.round((7.1 + noise(seed, i) * 3.7) * 10) / 10)
  const final = Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
  return { values, final }
}

export default function Hero ({ albums = [], children }) {
  const { track, playing, play, progress } = usePlayer()
  const [i, setI] = useState(0)
  const album = albums[i] || null
  const stage = useRef(null)
  const art = useRef(null)

  // Randomise after mount so server and client markup cannot disagree.
  useEffect(() => {
    if (albums.length > 1) setI(Math.floor(Math.random() * albums.length))
  }, [albums])

  // Always lands on a different sleeve: picking from the other albums rather
  // than the whole list means it never appears to do nothing.
  const shuffle = () => setI(n => {
    if (albums.length < 2) return n
    const pick = Math.floor(Math.random() * (albums.length - 1))
    return pick >= n ? pick + 1 : pick
  })

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

  const demo = scoresFor(album.name)

  // Fixed indices, so the server and client agree on the background shelf.
  const shelf = [7, 19, 28, 34, 41].map(i => albums[i % albums.length]).filter(Boolean)

  return (
    <header className="hero" ref={stage}>
      <div className="room" aria-hidden="true">
        <div className="room-wall" />
        <div className="room-beam" />
        <div className="room-shelf">
          {shelf.map((a, i) => (
            <img key={a.cover} src={a.cover} alt="" style={{ '--i': i }} />
          ))}
        </div>
        <div className="room-floor" />
        <div className="room-horizon" />
        <div className="room-dust">
          {[[8,22,17],[21,64,23],[37,12,29],[52,48,19],[63,78,25],[74,31,21],[88,58,27],[94,18,18]]
            .map(([x, y, d], i) => (
              <i key={i} style={{ left: `${x}%`, top: `${y}%`, '--d': `${d}s`, '--n': i }} />
          ))}
        </div>
      </div>

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

            <span className="rig-shadow" aria-hidden="true" />
            <span className="rig-reflect" aria-hidden="true">
              <img src={album.cover} alt="" />
            </span>

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
              <em className="card-tag">Example scores</em>
            </div>
            <ul className="card-rows">
              {CRITERIA.map((c, n) => {
                const target = demo.values[n] / 11
                const v = Math.min(1, Math.max(0, (filled - n * 0.06) / 0.5)) * target
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
              <strong className="tnum">{(filled * demo.final).toFixed(1)}</strong>
            </div>

            <button className="card-shuffle" onClick={shuffle}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 7h3.6l3 4.2M4 17h3.6l7-9.9H20M4 7h3.6M20 17h-5.4l-2-2.8"
                  fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
                <path d="m17.4 4.4 2.6 2.6-2.6 2.6M17.4 14.4 20 17l-2.6 2.6"
                  fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Another record
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
