'use client'

import { useEffect, useRef, useState } from 'react'

// Text that drifts sideways, but only when it has to.
//
// The player ellipsised long titles, and the end of a title is often the part
// that tells two versions of a song apart — the remix, the live take, who it is
// with. This measures the text against its box and animates only when there is
// something hidden: anything that already fits must never move, or the player
// fidgets at rest.
//
// Reduced motion is answered by not running at all rather than by a shorter
// animation, and the ellipsis comes back in that case, so the fallback is the
// behaviour this replaced rather than a silently clipped word.

// The width the text actually wants, measured off a Range rather than off the
// element. scrollWidth is rounded to an integer, and on a title overflowing by
// a pixel or two that rounding decides the question the wrong way; worse, an
// element wearing text-overflow: ellipsis reports scrollWidth === clientWidth
// in some engines, so the overflow it is currently hiding is invisible to the
// measurement that decides whether to reveal it. A Range measures the content,
// not the box, and is not clipped by either.
const contentWidth = el => {
  try {
    const r = document.createRange()
    r.selectNodeContents(el)
    const w = r.getBoundingClientRect().width
    if (w > 0) return w
  } catch { /* fall through */ }
  return el.scrollWidth
}

export default function Marquee ({ children, className = '' }) {
  const box = useRef(null)
  const text = useRef(null)
  const [distance, setDistance] = useState(0)

  useEffect(() => {
    const b = box.current
    const t = text.current
    if (!b || !t) return

    const still = window.matchMedia('(prefers-reduced-motion: reduce)')
    const measure = () => {
      // Two pixels of slack: a title that fits can measure a hair over and
      // scroll by nothing, forever.
      const over = Math.ceil(contentWidth(t) - b.clientWidth)
      setDistance(still.matches || over <= 2 ? 0 : over)
    }

    measure()

    // The display face loads after the first paint, and it is wider than the
    // fallback it replaces. Without this a title that fitted in the fallback
    // keeps the verdict it was given before the real font arrived: ellipsised,
    // with nothing left to trigger a second look.
    let dead = false
    document.fonts?.ready.then(() => { if (!dead) measure() }).catch(() => {})

    const ro = new ResizeObserver(measure)
    ro.observe(b)
    still.addEventListener('change', measure)
    return () => {
      dead = true
      ro.disconnect()
      still.removeEventListener('change', measure)
    }
  }, [children])

  const running = distance > 0

  return (
    <div className={`mq ${className}`} ref={box}>
      <span
        ref={text}
        className={running ? 'mq-run' : ''}
        // Constant speed rather than constant duration, so a title twice as
        // long takes twice as long instead of scrolling twice as fast.
        style={running ? { '--mq-d': `${distance}px`, '--mq-t': `${(distance / 22 + 3.4).toFixed(2)}s` } : undefined}
      >
        {children}
      </span>
    </div>
  )
}
