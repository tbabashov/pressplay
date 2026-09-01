'use client'

import { useRef } from 'react'
import { usePlayer } from './Player'
import Meter from './Meter'

export default function NowPlaying () {
  const { track, playing, progress, loading, toggle, dismiss, seek } = usePlayer()
  const bar = useRef(null)

  if (!track) return null

  const scrub = e => {
    const r = bar.current?.getBoundingClientRect()
    if (r) seek(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)))
  }

  return (
    <div className={`dock ${track ? 'up' : ''}`} role="region" aria-label="Preview player">
      <button
        className="dock-art"
        onClick={toggle}
        aria-label={playing ? `Pause ${track.track}` : `Play ${track.track}`}
      >
        <img src={track.cover} alt="" />
        <span className="dock-play">
          {loading
            ? <svg viewBox="0 0 24 24" className="spin"><circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeDasharray="14 36" /></svg>
            : playing
              ? <svg viewBox="0 0 24 24"><rect x="7" y="5.5" width="3.4" height="13" rx="1.2" /><rect x="13.6" y="5.5" width="3.4" height="13" rx="1.2" /></svg>
              : <svg viewBox="0 0 24 24"><path d="M8.5 5.6v12.8a.8.8 0 0 0 1.22.68l10.1-6.4a.8.8 0 0 0 0-1.36L9.72 4.92a.8.8 0 0 0-1.22.68Z" /></svg>}
        </span>
      </button>

      <div className="dock-body">
        <div className="dock-meta">
          <strong>{track.track}</strong>
          <span>{track.artist}</span>
        </div>
        <div
          className="dock-bar"
          ref={bar}
          onPointerDown={scrub}
          role="slider"
          tabIndex={0}
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          onKeyDown={e => {
            if (e.key === 'ArrowRight') seek(Math.min(1, progress + 0.05))
            if (e.key === 'ArrowLeft') seek(Math.max(0, progress - 0.05))
          }}
        >
          <i style={{ transform: `scaleX(${progress})` }} />
        </div>
      </div>

      <Meter />

      <button
        className="dock-toggle"
        onClick={toggle}
        aria-label={playing ? 'Pause' : 'Play'}
      >
        {playing
          ? <svg viewBox="0 0 24 24"><rect x="7" y="5.5" width="3.4" height="13" rx="1.2" /><rect x="13.6" y="5.5" width="3.4" height="13" rx="1.2" /></svg>
          : <svg viewBox="0 0 24 24"><path d="M8.5 5.6v12.8a.8.8 0 0 0 1.22.68l10.1-6.4a.8.8 0 0 0 0-1.36L9.72 4.92a.8.8 0 0 0-1.22.68Z" /></svg>}
      </button>

      <button className="dock-x" onClick={dismiss} aria-label="Close the player">
        <svg viewBox="0 0 24 24"><path d="M6.5 6.5l11 11m0-11l-11 11" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" /></svg>
      </button>
    </div>
  )
}
