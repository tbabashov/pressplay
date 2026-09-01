'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

// The set is a row you push along, and any one of them opens full size. Seven
// portrait slides stacked down a page is a scroll nobody finishes; side by side
// they read as what they are, a carousel meant for a phone.
export default function Slides ({ slides }) {
  const [open, setOpen] = useState(null)   // index of the slide being viewed
  const rail = useRef(null)

  const step = useCallback(d => {
    setOpen(i => (i === null ? null : (i + d + slides.length) % slides.length))
  }, [slides.length])

  useEffect(() => {
    if (open === null) return
    const onKey = e => {
      if (e.key === 'Escape') setOpen(null)
      if (e.key === 'ArrowRight') step(1)
      if (e.key === 'ArrowLeft') step(-1)
    }
    document.addEventListener('keydown', onKey)
    // The page behind must not scroll while a slide is over it.
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, step])

  const nudge = d => {
    const el = rail.current
    if (!el) return
    el.scrollBy({ left: d * (el.clientWidth * 0.8), behavior: 'smooth' })
  }

  return (
    <>
      <div className="sl">
        <button className="sl-arrow sl-prev" onClick={() => nudge(-1)} aria-label="Scroll the slides left">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>

        <div className="sl-rail" ref={rail} role="list">
          {slides.map((s, i) => (
            <button
              key={s.src} className="sl-item" role="listitem"
              onClick={() => setOpen(i)}
              aria-label={`${s.label}. Open it full size.`}
            >
              <img src={s.src} alt={s.label} width="540" height="960" loading="lazy" />
              <span className="sl-label">{s.label}</span>
            </button>
          ))}
        </div>

        <button className="sl-arrow sl-next" onClick={() => nudge(1)} aria-label="Scroll the slides right">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 5.5 16 12l-6.5 6.5" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>

      {open !== null && (
        <div className="sv" role="dialog" aria-modal="true" aria-label={slides[open].label}>
          <button className="sv-scrim" onClick={() => setOpen(null)} aria-label="Close" />

          <button className="sv-arrow sv-prev" onClick={() => step(-1)} aria-label="Previous slide">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5" fill="none"
              stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>

          <figure className="sv-figure">
            <img src={slides[open].src} alt={slides[open].label} />
            <figcaption>
              {slides[open].label}
              <em>{open + 1} of {slides.length}</em>
            </figcaption>
          </figure>

          <button className="sv-arrow sv-next" onClick={() => step(1)} aria-label="Next slide">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9.5 5.5 16 12l-6.5 6.5" fill="none"
              stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>

          <button className="sv-close" onClick={() => setOpen(null)} aria-label="Close">
            <svg viewBox="0 0 24 24"><path d="M6.5 6.5l11 11m0-11l-11 11" fill="none"
              stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" /></svg>
          </button>
        </div>
      )}
    </>
  )
}
