'use client'

import { useEffect, useRef, useState } from 'react'
import { usePlayer } from './audio/Player'

// Not texture any more: every cover here is playable. Two rows drifting in
// opposite directions, each duplicated so the loop is seamless. Hovering a row
// stops it so the thing you reached for stays reachable.
export default function Wall ({ albums }) {
  const { track, playing, play } = usePlayer()
  const half = Math.ceil(albums.length / 2)
  const rows = [albums.slice(0, half), albums.slice(half)]

  // Two masked rows of a hundred odd covers, translating forever, underneath a
  // full-viewport blend layer: left running off screen it repaints the whole
  // page for something nobody is looking at. It only moves while it is in view.
  const ref = useRef(null)
  const [near, setNear] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (!('IntersectionObserver' in window)) { setNear(true); return }
    const io = new IntersectionObserver(
      ([e]) => setNear(e.isIntersecting),
      { rootMargin: '200px 0px' }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <section
      className={`wall${near ? '' : ' wall-idle'}`}
      ref={ref}
      aria-label="Album covers across many genres"
    >
      <div className="wall-copy shell">
        <h2 className="display h2 rv">Rate anything with a tracklist.</h2>
        <p className="lede measure rv" style={{ '--d': '90ms' }}>
          Studio albums, mixtapes, live records, one-pressing tapes. If it has songs, you can
          score it. Press any cover to hear thirty seconds of it.
        </p>
      </div>

      {rows.map((row, i) => (
        <div className="wall-row" key={i} data-dir={i === 1 ? 'rev' : undefined}>
          <div className="wall-track" style={{ '--dur': `${74 + i * 18}s` }}>
            {[...row, ...row].map((a, j) => {
              const on = track?.dz === a.dz
              return (
                <button
                  key={`${a.cover}-${j}`}
                  className={`wall-cell${on ? ' on' : ''}${on && playing ? ' live' : ''}`}
                  onClick={() => play(a)}
                  aria-label={`Play a preview of ${a.name} by ${a.artist}`}
                  tabIndex={j < row.length ? 0 : -1}
                  aria-hidden={j >= row.length}
                >
                  <img src={a.cover} alt="" width="126" height="126" loading="lazy" />
                  <span className="wall-glyph" aria-hidden="true">
                    {on && playing
                      ? <svg viewBox="0 0 24 24"><rect x="7" y="5.5" width="3.4" height="13" rx="1.2" /><rect x="13.6" y="5.5" width="3.4" height="13" rx="1.2" /></svg>
                      : <svg viewBox="0 0 24 24"><path d="M8.5 5.6v12.8a.8.8 0 0 0 1.22.68l10.1-6.4a.8.8 0 0 0 0-1.36L9.72 4.92a.8.8 0 0 0-1.22.68Z" /></svg>}
                  </span>
                  <span className="wall-tip" aria-hidden="true">
                    <strong>{a.name}</strong>
                    <em>{a.artist}</em>
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </section>
  )
}
